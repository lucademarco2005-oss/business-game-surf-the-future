"""
Timer API — stato in memoria, nessun impatto sul gioco.
Usato solo per mostrare un conto alla rovescia sulla TV dashboard.
"""

import time
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/timer", tags=["timer"])

# ── Stato in memoria ───────────────────────────────────────────────────────────
_state = {
    "total_seconds": 300,       # durata impostata (default 5 min)
    "remaining_seconds": 300.0, # secondi rimanenti (aggiornato quando paused)
    "running": False,
    "end_time": None,           # unix timestamp di fine (quando running=True)
}


def _snapshot() -> dict:
    """Calcola lo stato corrente (remaining calcolato live se running)."""
    s = dict(_state)
    if s["running"] and s["end_time"] is not None:
        remaining = max(0.0, s["end_time"] - time.time())
        s["remaining_seconds"] = remaining
        if remaining <= 0:
            # Auto-stop a fine conto
            _state["running"] = False
            _state["remaining_seconds"] = 0.0
            _state["end_time"] = None
            s["running"] = False
            s["remaining_seconds"] = 0.0
    return {
        "total_seconds": s["total_seconds"],
        "remaining_seconds": round(s["remaining_seconds"], 1),
        "running": s["running"],
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def get_timer():
    """Restituisce lo stato corrente del timer."""
    return _snapshot()


class SetRequest(BaseModel):
    seconds: int


@router.post("/set")
def set_timer(body: SetRequest):
    """Imposta la durata del timer e fa il reset. Accetta secondi totali."""
    secs = max(1, body.seconds)
    _state["total_seconds"] = secs
    _state["remaining_seconds"] = float(secs)
    _state["running"] = False
    _state["end_time"] = None
    return _snapshot()


@router.post("/start")
def start_timer():
    """Avvia (o riprende) il timer."""
    if not _state["running"]:
        remaining = _state["remaining_seconds"]
        if remaining <= 0:
            remaining = float(_state["total_seconds"])
        _state["end_time"] = time.time() + remaining
        _state["running"] = True
    return _snapshot()


@router.post("/stop")
def stop_timer():
    """Mette in pausa il timer salvando i secondi rimanenti."""
    if _state["running"] and _state["end_time"] is not None:
        _state["remaining_seconds"] = max(0.0, _state["end_time"] - time.time())
        _state["running"] = False
        _state["end_time"] = None
    return _snapshot()


@router.post("/reset")
def reset_timer():
    """Riporta il timer alla durata impostata."""
    _state["remaining_seconds"] = float(_state["total_seconds"])
    _state["running"] = False
    _state["end_time"] = None
    return _snapshot()
