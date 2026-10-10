"""Errores de la API con formato unico {"error", "detalle"}."""
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    """Error de negocio controlado."""

    def __init__(self, status_code: int, error: str, detalle: Optional[Any] = None) -> None:
        self.status_code = status_code
        self.error = error
        self.detalle = detalle
        super().__init__(error)


def _respuesta(status_code: int, error: str, detalle: Optional[Any] = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "detalle": detalle})


def _limpiar_errores_validacion(errores: list) -> list:
    """Deja solo campos serializables en el detalle de un 422."""
    limpios = []
    for error in errores:
        limpios.append(
            {
                "loc": [str(parte) for parte in error.get("loc", [])],
                "msg": str(error.get("msg", "")),
                "type": str(error.get("type", "")),
            }
        )
    return limpios


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(request: Request, exc: APIError):
        return _respuesta(exc.status_code, exc.error, exc.detalle)

    @app.exception_handler(RequestValidationError)
    async def _validacion(request: Request, exc: RequestValidationError):
        return _respuesta(422, "Datos invalidos", _limpiar_errores_validacion(exc.errors()))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        detalle = exc.detail if not isinstance(exc.detail, str) else None
        mensaje = exc.detail if isinstance(exc.detail, str) else "Error HTTP"
        return _respuesta(exc.status_code, mensaje, detalle)

    @app.exception_handler(Exception)
    async def _inesperado(request: Request, exc: Exception):
        return _respuesta(500, "Error interno del servidor", str(exc))
