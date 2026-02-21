from __future__ import annotations

from functools import lru_cache

from beartype import beartype
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_base_url: str = Field(default="https://api.polza.ai/api/v1", alias="OPENAI_BASE_URL")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(default="google/gemini-3-flash-preview", alias="OPENAI_MODEL")
    transcript_languages: str = Field(default="en,ru,es,pt", alias="TRANSCRIPT_LANGUAGES")
    cors_allow_origins: str = Field(default="*", alias="CORS_ALLOW_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@beartype
def get_settings() -> Settings:
    return _get_settings_cached()


@lru_cache(maxsize=1)
def _get_settings_cached() -> Settings:
    return Settings()
