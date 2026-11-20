from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "LARA Runtime"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="development, test, production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG, INFO, WARNING, ERROR")

    # Security & Sessions
    SECRET_KEY: str = Field(default="lara-prototype-secret-key-do-not-use-in-production-min32chars", min_length=32)
    SESSION_COOKIE_NAME: str = "lara_session"
    SESSION_MAX_AGE_SECONDS: int = 86400  # 24 hours
    COOKIE_SECURE: bool = False  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = "lax"

    # Google Cloud settings
    GOOGLE_CLOUD_PROJECT: str = Field(default="lara-prototype-dev")
    FIRESTORE_DATABASE: str = Field(default="(default)")
    GCS_BUCKET: str = Field(default="lara-prototype-dev-bucket")
    VERTEX_AI_LOCATION: str = Field(default="us-central1")
    VERTEX_AI_MODEL: str = Field(default="gemini-2.5-flash")

    # goboxd Sandbox Settings
    GOBOXD_BASE_URL: str = Field(default="http://localhost:8081")
    GOBOXD_INTERNAL_AUTH_TOKEN: str = Field(default="dev-internal-token-goboxd")
    GOBOXD_TIMEOUT_SECONDS: float = 15.0
    GOBOXD_KILL_SWITCH: bool = Field(default=False, description="When true, all sandbox execution is blocked")
    SANDBOX_MAX_WALL_TIME_S: int = 10
    SANDBOX_MAX_MEMORY_KB: int = 1048576  # 1 GB
    SANDBOX_MAX_PROCESSES: int = 100
    SANDBOX_ALLOWED_LANGUAGES: List[str] = Field(default_factory=lambda: ["py3", "cpp", "c"])

    # Graph Traversal Limits
    GRAPH_MAX_DEPTH: int = 5
    GRAPH_MAX_PATHS: int = 50
    GRAPH_CACHE_TTL_SECONDS: int = 300

    # Task Orchestration Limits
    TASK_TIMEOUT_SECONDS: int = 120
    MAX_REQUEST_BODY_BYTES: int = 1048576  # 1 MB

settings = Settings()
