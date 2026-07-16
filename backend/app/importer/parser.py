"""
Shared Timeline JSON parser — single source of parsing logic.

Both the manual upload endpoint and the automated Drive importer
call this module. Never duplicate this logic elsewhere.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timezone
from typing import Any

_GPS_RE = re.compile(r"([+-]?\d+(?:\.\d+)?)°?,\s*([+-]?\d+(?:\.\d+)?)°?")

# Maps raw Google Timeline activity type strings to display groups.
_MODE_GROUP: dict[str, str] = {
    "IN_PASSENGER_VEHICLE": "driving",
    "IN_ROAD_VEHICLE": "driving",
    "IN_VEHICLE": "driving",
    "MOTORCYCLING": "driving",
    "IN_BUS": "transit",
    "IN_RAIL_VEHICLE": "transit",
    "IN_SUBWAY": "transit",
    "IN_TRAIN": "transit",
    "IN_TRAM": "transit",
    "IN_FERRY": "transit",
    "WALKING": "walking",
    "ON_FOOT": "walking",
    "RUNNING": "running",
    "ON_BICYCLE": "cycling",
    "CYCLING": "cycling",
    "FLYING": "flying",
}


def _parse_latlng(text: str) -> tuple[float, float] | None:
    """Parse a '37.4219°, -122.084°' string into (lat, lng). Returns None on failure."""
    if not text:
        return None
    m = _GPS_RE.search(text)
    if not m:
        return None
    try:
        return float(m.group(1)), float(m.group(2))
    except ValueError:
        return None


def _parse_dt(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _calendar_date(dt: datetime | None, fallback_dt: datetime | None = None) -> date | None:
    target = dt or fallback_dt
    if target is None:
        return None
    return target.date()


def _mode_group(raw: str | None) -> str | None:
    if raw is None:
        return None
    return _MODE_GROUP.get(raw, "other")


def parse_timeline(data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Parse a Google Timeline export dict into a list of location segment dicts.

    Each dict maps directly to a LocationSegment row. Segments that cannot be
    parsed at all are skipped silently; individual bad GPS points within a valid
    segment are skipped without dropping the whole segment.

    Raises:
        ValueError: if `data` does not contain a `semanticSegments` list.
    """
    segments_raw = data.get("semanticSegments")
    if not isinstance(segments_raw, list):
        raise ValueError("Input JSON does not contain a 'semanticSegments' array")

    results: list[dict[str, Any]] = []

    for raw in segments_raw:
        if not isinstance(raw, dict):
            continue

        start_dt = _parse_dt(raw.get("startTime"))
        end_dt = _parse_dt(raw.get("endTime"))

        # --- activity segment ---
        if "activity" in raw:
            activity = raw["activity"]
            if not isinstance(activity, dict):
                continue
            top = activity.get("topCandidate") or {}
            mode_raw: str | None = top.get("type")
            distance: float | None = activity.get("distanceMeters")

            cal_date = _calendar_date(start_dt)
            if cal_date is None:
                continue

            # Build path points from the activity's own start/end coordinates if available
            path_points: list[dict] = []
            origin = activity.get("start") or {}
            dest = activity.get("end") or {}
            for loc_obj, ts in [(origin, start_dt), (dest, end_dt)]:
                latlng_str = loc_obj.get("latLng") or loc_obj.get("point", "")
                coords = _parse_latlng(latlng_str)
                if coords and ts:
                    path_points.append({"lat": coords[0], "lng": coords[1], "ts": ts.isoformat()})

            results.append({
                "calendar_date": cal_date,
                "segment_type": "activity",
                "started_at": start_dt,
                "ended_at": end_dt,
                "transport_mode_raw": mode_raw,
                "transport_mode_group": _mode_group(mode_raw),
                "distance_meters": distance,
                "place_lat": None,
                "place_lng": None,
                "place_semantic_type": None,
                "path_points": path_points or None,
            })

        # --- visit segment ---
        elif "visit" in raw:
            visit = raw["visit"]
            if not isinstance(visit, dict):
                continue
            top = visit.get("topCandidate") or {}
            place_loc = top.get("placeLocation") or {}
            latlng_str = place_loc.get("latLng", "")
            coords = _parse_latlng(latlng_str)
            semantic_type: str | None = top.get("semanticType")

            cal_date = _calendar_date(start_dt)
            if cal_date is None:
                continue

            results.append({
                "calendar_date": cal_date,
                "segment_type": "visit",
                "started_at": start_dt,
                "ended_at": end_dt,
                "transport_mode_raw": None,
                "transport_mode_group": None,
                "distance_meters": None,
                "place_lat": coords[0] if coords else None,
                "place_lng": coords[1] if coords else None,
                "place_semantic_type": semantic_type,
                "path_points": None,
            })

        # --- timelinePath segment ---
        elif "timelinePath" in raw:
            path_raw = raw["timelinePath"]
            if not isinstance(path_raw, list):
                continue

            cal_date = _calendar_date(start_dt)
            if cal_date is None:
                continue

            path_points = []
            for point in path_raw:
                if not isinstance(point, dict):
                    continue
                coords = _parse_latlng(point.get("point", ""))
                if coords is None:
                    continue  # skip bad GPS point, keep the rest
                ts = point.get("time")
                path_points.append({"lat": coords[0], "lng": coords[1], "ts": ts})

            results.append({
                "calendar_date": cal_date,
                "segment_type": "timeline_path",
                "started_at": start_dt,
                "ended_at": end_dt,
                "transport_mode_raw": None,
                "transport_mode_group": None,
                "distance_meters": None,
                "place_lat": None,
                "place_lng": None,
                "place_semantic_type": None,
                "path_points": path_points or None,
            })

        # timelineMemory and unknown types are skipped

    return results
