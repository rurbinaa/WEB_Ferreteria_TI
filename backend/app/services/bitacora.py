"""Servicio unico de bitacora.

Toda la bitacora del sistema se escribe desde aqui. No existen endpoints
para editar ni borrar registros.
"""
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Bitacora, Usuario


def _nombre_usuario(usuario: Optional[Usuario], usuario_nombre: Optional[str]) -> Optional[str]:
    if usuario is not None:
        return usuario.nombre_completo or usuario.nombre_usuario
    return usuario_nombre


def registrar(
    db: Session,
    *,
    accion: str,
    usuario: Optional[Usuario] = None,
    usuario_nombre: Optional[str] = None,
    entidad: Optional[str] = None,
    entidad_id: Optional[Any] = None,
    resultado: str = "ok",
    detalle: Optional[str] = None,
) -> None:
    """Registra una accion en la bitacora y la persiste de inmediato.

    Se confirma en su propia transaccion para que el registro sobreviva
    aunque la operacion principal falle y se revierta.
    """
    registro = Bitacora(
        usuario_id=usuario.id if usuario is not None else None,
        usuario_nombre=_nombre_usuario(usuario, usuario_nombre),
        accion=accion,
        entidad=entidad,
        entidad_id=str(entidad_id) if entidad_id is not None else None,
        resultado=resultado,
        detalle=detalle,
    )
    db.add(registro)
    try:
        db.commit()
    except Exception:
        db.rollback()
