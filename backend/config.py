from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./aiops.db"
    api_token: str = Field(min_length=24)
    ingest_token: str = Field(min_length=24)
    lab_token: str = Field(min_length=24)
    lab_url: str = "http://127.0.0.1:8100"
    monitor_enabled: bool = True
    monitor_interval: float = Field(default=10, ge=1)
    failure_threshold: int = Field(default=2, ge=1)
    diagnosis_provider: Literal["rules", "openai"] = "rules"
    openai_api_key: str = ""
    openai_model: str = ""
    qdrant_url: str = ""
    approval_ttl_seconds: int = Field(default=300, ge=1, le=3600)
    enable_lab_execution: bool = False
    cookie_secure: bool = False

    @model_validator(mode="after")
    def validate_keys(self) -> "Settings":
        if len({self.api_token, self.ingest_token, self.lab_token}) != 3:
            raise ValueError("Use separate API, ingestion and lab secrets")
        if self.diagnosis_provider == "openai" and (
            not self.openai_api_key or not self.openai_model
        ):
            raise ValueError("OpenAI mode requires OPENAI_API_KEY and OPENAI_MODEL")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
