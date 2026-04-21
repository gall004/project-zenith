from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    LIVEKIT_API_KEY: str = "dev_key"
    LIVEKIT_API_SECRET: str = "dev_secret"
    LIVEKIT_URL: str = "ws://localhost:7880"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./zenith.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    NEXT_PUBLIC_API_BASE_URL: str = "http://localhost:8000"
    
    # CES Agent Configuration (ces.googleapis.com/v1beta)
    GCP_PROJECT_ID: str = ""
    CES_APP_ID: str = ""
    CES_REGION: str = "us"
    GCS_ATTACHMENT_BUCKET: str = ""
    GCS_BUCKET_LOCATION: str = "US"

    # Gemini API Key (retained for Pipecat media pipeline in future sprints)
    GEMINI_API_KEY: str = "mock-key-for-dev"

    # Production CORS: comma-separated allowed origins.
    # Set via deploy.sh; defaults to localhost for dev.
    CORS_ORIGINS: str = "http://localhost:3000"

    # Backend's own public URL (for CES webhook registration).
    FASTAPI_BACKEND_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

