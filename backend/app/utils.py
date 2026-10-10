"""Utilidades varias."""
from datetime import date, datetime, timezone


def ahora_utc() -> datetime:
    """Hora actual en UTC, sin zona (compatible con SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hoy_utc() -> date:
    return ahora_utc().date()
