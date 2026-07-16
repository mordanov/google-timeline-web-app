"""Google Drive API wrapper — list and download Timeline files from a folder."""
import json
import logging
from io import BytesIO

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

logger = logging.getLogger(__name__)

_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def _build_service(service_account_json: str):
    info = json.loads(service_account_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=_SCOPES)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def list_files(service_account_json: str, folder_id: str) -> list[dict]:
    """Return list of dicts with id, name, modifiedTime, md5Checksum for all non-trashed files in folder."""
    service = _build_service(service_account_json)
    results = []
    page_token = None
    while True:
        kwargs = dict(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="nextPageToken, files(id, name, modifiedTime, md5Checksum)",
            pageSize=100,
        )
        if page_token:
            kwargs["pageToken"] = page_token
        response = service.files().list(**kwargs).execute()
        results.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break
    return results


def download_file(service_account_json: str, file_id: str) -> bytes:
    """Download file content and return as bytes."""
    service = _build_service(service_account_json)
    request = service.files().get_media(fileId=file_id)
    buf = BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()
