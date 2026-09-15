from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, sourced from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Local docker-compose default; override with the Supabase connection
    # string in production via the DATABASE_URL env var.
    database_url: str = (
        "postgresql+psycopg2://prism:prism@localhost:5432/prism"
    )

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    # qwen/qwen3-32b was deprecated by Groq (shut down 2026-07-17); this is
    # its current successor on the free/developer tier. Override via env if
    # Groq's catalog changes again — check `client.models.list()`.
    groq_model: str = "qwen/qwen3.8-27b"

    embedding_model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"

    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
