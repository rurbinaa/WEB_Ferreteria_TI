"""Respaldo de la base de datos con marca de tiempo.

Uso:
    python scripts/backup.py            # guarda en backend/backups/
    python scripts/backup.py --dir ruta

Opcional: ajustar el destino para subirlo a almacenamiento en la nube.
"""
import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.utils import ahora_utc  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Respaldo de la base de datos.")
    parser.add_argument(
        "--dir",
        default=str(Path(__file__).resolve().parent.parent / "backups"),
        help="Directorio donde se guarda el respaldo.",
    )
    args = parser.parse_args()

    url = settings.DATABASE_URL
    if not url.startswith("sqlite"):
        print(f"No hay respaldo local configurado para DATABASE_URL={url}")
        return

    if "///" in url:
        ruta_db = Path(url.split("///", 1)[1])
    else:
        ruta_db = Path(url.replace("sqlite:///", "", 1))
    ruta_db = ruta_db.resolve()

    if not ruta_db.exists():
        print(f"No existe la base de datos en {ruta_db}")
        sys.exit(1)

    destino_dir = Path(args.dir)
    destino_dir.mkdir(parents=True, exist_ok=True)

    marca = ahora_utc().strftime("%Y%m%d_%H%M%S")
    destino = destino_dir / f"ferreteria_{marca}.db"

    shutil.copy2(ruta_db, destino)
    print(f"Respaldo guardado en: {destino}")


if __name__ == "__main__":
    main()