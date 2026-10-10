"""Configuracion central de la aplicacion (variables de entorno)."""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Aplicacion
    APP_NAME: str = "Ferreteria API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Seguridad
    SECRET_KEY: str = "cambia-esta-clave-cambia-esta-clave-generada-por-el-usuario"
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 480
    LOGIN_MAX_INTENTOS: int = 5
    LOGIN_BLOQUEO_MINUTOS: int = 15

    # Base de datos
    DATABASE_URL: str = "sqlite:///./ferreteria.db"

    # CORS (lista separada por comas)
    ALLOWED_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080"

    # Reglas de negocio / analitica
    DIAS_VENTANA: int = 30
    DIAS_COBERTURA: int = 7
    DIAS_HISTORIAL_MINIMO: int = 7

    # Datos de prueba
    SEED_ADMIN_PASSWORD: str = "admin123"
    SEED_VENDEDOR_PASSWORD: str = "vendedor123"

    # Si es True y la base de datos esta vacia, se ejecuta el seed al arrancar
    AUTO_SEED: bool = False

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def _normalizar_origenes(cls, valor: str) -> str:
        return valor

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origen.strip() for origen in self.ALLOWED_ORIGINS.split(",") if origen.strip()]


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
