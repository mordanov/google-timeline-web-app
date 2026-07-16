"""Required parser correctness tests (constitution mandate)."""
import pytest
from datetime import date

from app.importer.parser import parse_timeline


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_activity(
    start="2024-01-15T08:00:00.000Z",
    end="2024-01-15T08:22:00.000Z",
    activity_type="IN_PASSENGER_VEHICLE",
    distance=1649.0,
):
    return {
        "startTime": start,
        "endTime": end,
        "activity": {
            "topCandidate": {"type": activity_type, "probability": 0.9},
            "distanceMeters": distance,
        },
    }


def _make_visit(
    start="2024-01-15T09:00:00.000Z",
    end="2024-01-15T12:00:00.000Z",
    latlng="37.4219°, -122.0840°",
    semantic_type="TYPE_HOME",
):
    return {
        "startTime": start,
        "endTime": end,
        "visit": {
            "topCandidate": {
                "placeLocation": {"latLng": latlng},
                "semanticType": semantic_type,
                "probability": 0.9,
            }
        },
    }


def _make_timeline_path(
    start="2024-01-15T07:00:00.000Z",
    end="2024-01-15T07:30:00.000Z",
    points=None,
):
    if points is None:
        points = [
            {"point": "37.4219°, -122.0840°", "time": "2024-01-15T07:00:00Z"},
            {"point": "37.4300°, -122.0900°", "time": "2024-01-15T07:15:00Z"},
        ]
    return {
        "startTime": start,
        "endTime": end,
        "timelinePath": points,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestActivitySegments:
    def test_parses_activity_type_and_distance(self):
        data = {"semanticSegments": [_make_activity()]}
        result = parse_timeline(data)

        assert len(result) == 1
        seg = result[0]
        assert seg["segment_type"] == "activity"
        assert seg["transport_mode_raw"] == "IN_PASSENGER_VEHICLE"
        assert seg["transport_mode_group"] == "driving"
        assert seg["distance_meters"] == 1649.0

    def test_calendar_date_attribution(self):
        data = {"semanticSegments": [_make_activity(start="2024-03-20T23:00:00.000Z")]}
        result = parse_timeline(data)
        assert result[0]["calendar_date"] == date(2024, 3, 20)

    def test_activity_segment_has_no_place_fields(self):
        data = {"semanticSegments": [_make_activity()]}
        seg = parse_timeline(data)[0]
        assert seg["place_lat"] is None
        assert seg["place_lng"] is None
        assert seg["place_semantic_type"] is None


class TestVisitSegments:
    def test_parses_visit_coordinates(self):
        data = {"semanticSegments": [_make_visit()]}
        result = parse_timeline(data)

        assert len(result) == 1
        seg = result[0]
        assert seg["segment_type"] == "visit"
        assert abs(seg["place_lat"] - 37.4219) < 1e-4
        assert abs(seg["place_lng"] - (-122.084)) < 1e-4

    def test_parses_semantic_type(self):
        data = {"semanticSegments": [_make_visit(semantic_type="TYPE_WORK")]}
        seg = parse_timeline(data)[0]
        assert seg["place_semantic_type"] == "TYPE_WORK"

    def test_visit_has_no_transport_mode(self):
        data = {"semanticSegments": [_make_visit()]}
        seg = parse_timeline(data)[0]
        assert seg["transport_mode_group"] is None
        assert seg["transport_mode_raw"] is None

    def test_visit_with_missing_latlng_skips_coordinates(self):
        raw = {
            "startTime": "2024-01-15T09:00:00Z",
            "endTime": "2024-01-15T10:00:00Z",
            "visit": {"topCandidate": {"placeLocation": {}, "semanticType": "TYPE_HOME"}},
        }
        data = {"semanticSegments": [raw]}
        seg = parse_timeline(data)[0]
        assert seg["place_lat"] is None
        assert seg["place_lng"] is None


class TestTimelinePathSegments:
    def test_parses_path_points(self):
        data = {"semanticSegments": [_make_timeline_path()]}
        result = parse_timeline(data)

        assert len(result) == 1
        seg = result[0]
        assert seg["segment_type"] == "timeline_path"
        assert isinstance(seg["path_points"], list)
        assert len(seg["path_points"]) == 2
        assert abs(seg["path_points"][0]["lat"] - 37.4219) < 1e-4

    def test_skips_bad_gps_point_keeps_rest(self):
        points = [
            {"point": "not-valid", "time": "2024-01-15T07:00:00Z"},
            {"point": "37.4219°, -122.0840°", "time": "2024-01-15T07:15:00Z"},
        ]
        data = {"semanticSegments": [_make_timeline_path(points=points)]}
        result = parse_timeline(data)

        # Segment still produced; only the valid point included
        assert len(result) == 1
        assert len(result[0]["path_points"]) == 1


class TestTransportModeGroupMapping:
    @pytest.mark.parametrize("raw_type,expected_group", [
        ("IN_PASSENGER_VEHICLE", "driving"),
        ("MOTORCYCLING", "driving"),
        ("IN_BUS", "transit"),
        ("IN_TRAIN", "transit"),
        ("WALKING", "walking"),
        ("ON_FOOT", "walking"),
        ("RUNNING", "running"),
        ("ON_BICYCLE", "cycling"),
        ("CYCLING", "cycling"),
        ("FLYING", "flying"),
        ("STILL", "other"),
        ("UNKNOWN_ACTIVITY_TYPE", "other"),
        ("SOME_FUTURE_TYPE", "other"),
    ])
    def test_mode_group_mapping(self, raw_type, expected_group):
        data = {"semanticSegments": [_make_activity(activity_type=raw_type)]}
        seg = parse_timeline(data)[0]
        assert seg["transport_mode_group"] == expected_group


class TestErrorHandling:
    def test_raises_on_missing_semantic_segments(self):
        with pytest.raises(ValueError, match="semanticSegments"):
            parse_timeline({})

    def test_raises_on_wrong_type_semantic_segments(self):
        with pytest.raises(ValueError, match="semanticSegments"):
            parse_timeline({"semanticSegments": "not-a-list"})

    def test_empty_semantic_segments_returns_empty_list(self):
        result = parse_timeline({"semanticSegments": []})
        assert result == []


class TestIdempotency:
    def test_same_input_same_output(self):
        data = {
            "semanticSegments": [
                _make_activity(),
                _make_visit(),
                _make_timeline_path(),
            ]
        }
        result1 = parse_timeline(data)
        result2 = parse_timeline(data)
        assert result1 == result2

    def test_mixed_segment_types_all_parsed(self):
        data = {
            "semanticSegments": [
                _make_activity(),
                _make_visit(),
                _make_timeline_path(),
            ]
        }
        result = parse_timeline(data)
        types = {s["segment_type"] for s in result}
        assert types == {"activity", "visit", "timeline_path"}
