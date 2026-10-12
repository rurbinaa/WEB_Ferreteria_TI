"""Endpoints de autenticacion."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Usuario
from app.schemas import ErrorResponse, LoginRequest, Token, UsuarioOut
from app.security import (
    crear_token,
    esta_bloqueado,
    get_current_user,
    limpiar_intentos,
    registrar_intento_fallido,
    verify_password,
)
from app.services import bitacora

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=Token,
    responses={401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
    summary="Inicia sesion y devuelve un token JWT",
)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> Token:
    if esta_bloqueado(data.nombre_usuario):
        bitacora.registrar(
            db,
            accion="LOGIN_FAIL",
            usuario_nombre=data.nombre_usuario,
            entidad="auth",
            resultado="error",
            detalle="Cuenta bloqueada temporalmente",
        )
        raise APIError(429, "Demasiados intentos fallidos. Intente mas tarde.")

    usuario = db.scalar(select(Usuario).where(Usuario.nombre_usuario == data.nombre_usuario))
    if usuario is None or not usuario.activo or not verify_password(data.password, usuario.password_hash):
        registrar_intento_fallido(data.nombre_usuario)
        bitacora.registrar(
            db,
            accion="LOGIN_FAIL",
            usuario_nombre=data.nombre_usuario,
            entidad="auth",
            resultado="error",
            detalle="Credenciales invalidas",
        )
        # Error generico: no revela si el usuario existe.
        raise APIError(401, "Usuario o contrasena incorrectos")

    limpiar_intentos(data.nombre_usuario)
    bitacora.registrar(
        db,
        accion="LOGIN_OK",
        usuario=usuario,
        entidad="auth",
        entidad_id=usuario.id,
        detalle="Inicio de sesion",
    )
    return Token(access_token=crear_token(usuario))


@router.get(
    "/me",
    response_model=UsuarioOut,
    responses={401: {"model": ErrorResponse}},
    summary="Devuelve el usuario autenticado",
)
def me(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    return usuario
