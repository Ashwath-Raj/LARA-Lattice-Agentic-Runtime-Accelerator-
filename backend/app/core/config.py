from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "LARA Runtime"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", validation_alias=AliasChoices("ENVIRONMENT", "APP_ENV"), description="development, test, production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG, INFO, WARNING, ERROR")

    # Security & Sessions
    SECRET_KEY: Optional[str] = Field(default=None, description="HMAC signing key; required in production (min 32 chars)")
    SESSION_COOKIE_NAME: str = "lara_session"
    SESSION_MAX_AGE_SECONDS: int = 86400  # 24 hours
    COOKIE_SECURE: bool = False  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = "lax"
    DEMO_PASSWORD: str = Field(default="demo-password", description="Default password for seeded demo accounts in non-production")
    CORS_ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8080"
        ],
        description="Explicit allowed CORS origins. Wildcard * prohibited when credentials are enabled."
    )

    # Google Cloud settings (Target Project must be supplied by the user/environment)
    GOOGLE_CLOUD_PROJECT: Optional[str] = Field(default=None, description="GCP project ID; required in production")
    FIRESTORE_DATABASE: str = Field(default="(default)")
    GCS_BUCKET: Optional[str] = Field(default=None, description="Private GCS bucket; required in production")
    VERTEX_AI_LOCATION: str = Field(default="global", description="Vertex AI location (e.g. global, asia-northeast1)")
    VERTEX_AI_MODEL: str = Field(default="gemini-3.8-flash", description="Vertex AI model; gemini-2.5-flash retired Oct 2026")

    # goboxd Sandbox Settings
    GOBOXD_BASE_URL: str = Field(default="http://localhost:8081")
    GOBOXD_INTERNAL_AUTH_TOKEN: Optional[str] = Field(default=None, description="Internal auth token for goboxd proxy")
    GOBOXD_TIMEOUT_SECONDS: float = 15.0
    GOBOXD_KILL_SWITCH: bool = Field(default=True, description="When true, all sandbox execution is blocked (fail closed)")
    SANDBOX_MAX_WALL_TIME_S: int = 10
    SANDBOX_MAX_MEMORY_KB: int = 1048576  # 1 GB
    SANDBOX_MAX_PROCESSES: int = 100
    SANDBOX_MAX_OUTPUT_BYTES: int = 65536  # 64 KB maximum response output
    SANDBOX_ALLOWED_LANGUAGES: List[str] = Field(default_factory=lambda: ["py3", "cpp", "c"])

    # Graph Traversal Limits
    GRAPH_MAX_DEPTH: int = 5
    GRAPH_MAX_PATHS: int = 50
    GRAPH_CACHE_TTL_SECONDS: int = 300

    # Task Orchestration Limits
    TASK_TIMEOUT_SECONDS: int = 120
    MAX_REQUEST_BODY_BYTES: int = 1048576  # 1 MB

    # File Storage Limits
    MAX_UPLOAD_SIZE_BYTES: int = 10485760  # 10 MB
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = Field(
        default_factory=lambda: [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/json",
            "image/png",
            "image/jpeg"
        ]
    )

    def get_secret_key(self) -> str:
        if self.SECRET_KEY:
            return self.SECRET_KEY
        if self.ENVIRONMENT.lower() in ["production", "prod"]:
            raise ValueError("SECRET_KEY must be configured in production environment!")
        return "lara-development-insecure-key-minimum-32-characters"

    def get_goboxd_token(self) -> str:
        if self.GOBOXD_INTERNAL_AUTH_TOKEN:
            return self.GOBOXD_INTERNAL_AUTH_TOKEN
        if self.ENVIRONMENT.lower() in ["production", "prod"]:
            raise ValueError("GOBOXD_INTERNAL_AUTH_TOKEN must be configured in production environment!")
        return "dev-internal-token-goboxd"

settings = Settings()
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    # Validate required production settings
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise ValueError("Production startup failed: SECRET_KEY is missing or shorter than 32 characters")
    if not settings.GOOGLE_CLOUD_PROJECT:
        raise ValueError("Production startup failed: GOOGLE_CLOUD_PROJECT must be configured")
    if not settings.GCS_BUCKET:
        raise ValueError("Production startup failed: GCS_BUCKET must be configured")
    if not settings.COOKIE_SECURE:
        raise ValueError("Production startup failed: COOKIE_SECURE must be True in production")
    if "*" in settings.CORS_ALLOWED_ORIGINS:
        raise ValueError("Production startup failed: Wildcard CORS origin is prohibited in production")
    if not settings.GOBOXD_KILL_SWITCH:
        if not settings.GOBOXD_INTERNAL_AUTH_TOKEN or len(settings.GOBOXD_INTERNAL_AUTH_TOKEN) < 16:
            raise ValueError("Production startup failed: GOBOXD_INTERNAL_AUTH_TOKEN must be securely configured when GOBOXD_KILL_SWITCH is False")
        if "localhost" in settings.GOBOXD_BASE_URL or "127.0.0.1" in settings.GOBOXD_BASE_URL:
            raise ValueError("Production startup failed: GOBOXD_BASE_URL must not point to localhost in production")
