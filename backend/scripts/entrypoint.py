"""Punto de entrada del contenedor.

Espera a que la base de datos este lista, crea las tablas, siembra datos
de demo si la base esta vacia (AUTO_SEED) y arranca uvicorn.
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select, text  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import SessionLocal, crear_tablas, engine  # noqa: E402


def esperar_db(intentos: int = 30, espera: float = 2.0) -> None:
    """Reintenta la conexion a la base de datos hasta que este lista."""
    for intento in range(1, intentos + 1):
        try:
            with engine.connect() as conexion:
                conexion.execute(text("SELECT 1"))
            return
        except Exception as exc:  # pragma: no cover - depende del entorno
            print(f"[entrypoint] Base de datos no disponible ({intento}/{intentos}): {exc}")
            time.sleep(espera)
    raise SystemExit("[entrypoint] No se pudo conectar a la base de datos")


def _base_vacia() -> bool:
    from app.models import Usuario

    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Usuario)) == 0


def main() -> None:
    esperar_db()
    crear_tablas()

    if settings.AUTO_SEED and _base_vacia():
        print("[entrypoint] Base de datos vacia: ejecutando seed...")
        from scripts import seed

        seed.run()

    host = os.getenv("APP_HOST", "0.0.0.0")
    port = os.getenv("APP_PORT", "8000")
    print(f"[entrypoint] Iniciando uvicorn en {host}:{port}")
    os.execv(
        sys.executable,
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", host, "--port", port],
    )


if __name__ == "__main__":
    main()
