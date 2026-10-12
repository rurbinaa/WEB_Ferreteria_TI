"""Utilidades varias."""
from datetime import date, datetime, time, timedelta, timezone
from typing import Tuple, Union


def ahora_utc() -> datetime:
    """Hora actual en UTC, sin zona (compatible con SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hoy_utc() -> date:
    return ahora_utc().date()


def rango_dia(dia: Union[str, date, datetime]) -> Tuple[datetime, datetime]:
    """Devuelve (inicio, fin_exclusivo) del dia como datetimes naive.

    Se usa para filtrar por dia de forma portable entre SQLite y Postgres
    (evita comparar `date(columna)` contra un texto). Acepta `date`,
    `datetime` o un texto ISO (YYYY-MM-DD).
    """
    if isinstance(dia, str):
        dia = date.fromisoformat(dia)
    elif isinstance(dia, datetime):
        dia = dia.date()
    inicio = datetime.combine(dia, time.min)
    return inicio, inicio + timedelta(days=1)
