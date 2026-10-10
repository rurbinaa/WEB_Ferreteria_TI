"""Aplicacion FastAPI para la ferreteria."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import crear_tablas
from app.errors import registrar_manejadores
from app.routers import alertas, auth, bitacora, entradas, productos, proveedores, reportes, ventas


@asynccontextmanager
async def lifespan(_app: FastAPI):
    crear_tablas()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="API de gestion para ferreteria: ventas, inventario, alertas de reposicion y bitacora.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_manejadores(app)

app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(proveedores.router)
app.include_router(ventas.router)
app.include_router(entradas.router)
app.include_router(alertas.router)
app.include_router(reportes.router)
app.include_router(bitacora.router)


@app.get("/health", tags=["health"], summary="Estado de salud del servicio (publico)")
def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}