"""Seguridad: hash de contrasenas, JWT y control de roles."""
import time
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.errors import APIError
from app.models import Usuario
from app.services import bitacora

bearer_scheme = HTTPBearer(auto_error=False)

# Control de intentos fallidos en memoria (suficiente para el prototipo).
_intentos: dict[str, dict] = {}


# --------------------------------------------------------------------------
# Contrasenas
# --------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# --------------------------------------------------------------------------
# Bloqueo temporal por intentos fallidos
# --------------------------------------------------------------------------
def esta_bloqueado(nombre_usuario: str) -> bool:
    registro = _intentos.get(nombre_usuario)
    if not registro:
        return False
    bloqueado_hasta = registro.get("bloqueado_hasta", 0)
    if bloqueado_hasta and time.time() < bloqueado_hasta:
        return True
    if bloqueado_hasta and time.time() >= bloqueado_hasta:
        _intentos.pop(nombre_usuario, None)
    return False


def registrar_intento_fallido(nombre_usuario: str) -> None:
    registro = _intentos.setdefault(nombre_usuario, {"fallos": 0, "bloqueado_hasta": 0})
    registro["fallos"] += 1
    if registro["fallos"] >= settings.LOGIN_MAX_INTENTOS:
        registro["bloqueado_hasta"] = time.time() + settings.LOGIN_BLOQUEO_MINUTOS * 60
        registro["fallos"] = 0


def limpiar_intentos(nombre_usuario: str) -> None:
    _intentos.pop(nombre_usuario, None)


# --------------------------------------------------------------------------
# JWT
# --------------------------------------------------------------------------
def crear_token(usuario: Usuario) -> str:
    ahora = int(time.time())
    payload = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
        "nombre_usuario": usuario.nombre_usuario,
        "iat": ahora,
        "exp": ahora + settings.TOKEN_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise APIError(401, "Sesion expirada")
    except jwt.PyJWTError:
        raise APIError(401, "Token invalido")


# --------------------------------------------------------------------------
# Dependencias
# --------------------------------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if credentials is None or not credentials.credentials:
        raise APIError(401, "No autenticado")

    payload = decodificar_token(credentials.credentials)
    try:
        usuario_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise APIError(401, "Token invalido")

    usuario = db.get(Usuario, usuario_id)
    if usuario is None or not usuario.activo:
        raise APIError(401, "No autenticado")
    return usuario


def require_role(*roles: str):
    """Fabrica de dependencias que valida el rol en el servidor."""

    def dependency(
        request: Request,
        db: Session = Depends(get_db),
        usuario: Usuario = Depends(get_current_user),
    ) -> Usuario:
        if usuario.rol not in roles:
            bitacora.registrar(
                db,
                accion="ACCESO_DENEGADO",
                usuario=usuario,
                entidad="endpoint",
                entidad_id=f"{request.method} {request.url.path}",
                resultado="error",
                detalle=f"Rol '{usuario.rol}' sin permiso para {request.method} {request.url.path}",
            )
            raise APIError(403, "Rol insuficiente para esta operacion")
        return usuario

    return dependency
