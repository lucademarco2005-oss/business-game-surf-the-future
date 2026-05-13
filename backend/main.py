"""
Main entry point - FastAPI application.

Avvia il server con: uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.persistence.database import init_db
from backend.api.routes_game import router as game_router
from backend.api.routes_player import router as player_router
from backend.api.routes_master import router as master_router
from backend.api.routes_admin import router as admin_router
from backend.api.routes_timer import router as timer_router

app = FastAPI(
    title="Investment Portfolio Simulator",
    description="Backend API per il simulatore di portafogli di investimento a turni",
    version="1.0.0",
)

# CORS: permette le richieste da tutti i frontend in sviluppo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra i router
app.include_router(game_router)
app.include_router(player_router)
app.include_router(master_router)
app.include_router(admin_router)
app.include_router(timer_router)


@app.on_event("startup")
def on_startup():
    """Inizializza il database all'avvio dell'applicazione."""
    init_db()


@app.get("/")
def root():
    return {
        "name": "Investment Portfolio Simulator",
        "version": "1.0.0",
        "docs": "/docs",
    }
