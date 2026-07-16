from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    google_service_account_json: str = ""
    google_drive_folder_id: str = ""
    sync_interval_seconds: int = 900

    vite_google_maps_api_key: str = ""


settings = Settings()
