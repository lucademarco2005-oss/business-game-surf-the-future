"""
API Routes - Master endpoints.

Endpoint per il Game Master:
- Controllo dei cicli di gioco
- Gestione giocatori
- Visione d'insieme dei portafogli
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.game.service import (
    start_game,
    reset_game,
    get_game_state,
    advance_cycle,
    close_decision_phase,
    get_leaderboard,
    open_trading,
    GameNotFoundError,
    InvalidPhaseError,
)
from backend.persistence.database import get_db
from backend.persistence import repositories as repo
from backend.portfolio.service import get_portfolio, PlayerNotFoundError

router = APIRouter(prefix="/api/master", tags=["master"])


class StartGameRequest(BaseModel):
    total_cycles: int = 5
    extra_cycles: int = 0  # cicli aggiuntivi senza eventi dopo l'ultimo ciclo con eventi


class CreatePlayerRequest(BaseModel):
    name: str
    initial_cash: float = 100000.0


class UpdatePlayerRequest(BaseModel):
    active: Optional[bool] = None


@router.post("/game/start")
def api_start_game(request: StartGameRequest):
    """Avvia una nuova partita con il numero di cicli specificato."""
    if request.total_cycles < 1:
        raise HTTPException(status_code=400, detail="total_cycles must be at least 1")
    return start_game(request.total_cycles, max(0, request.extra_cycles))


@router.post("/game/new")
def api_new_game(request: StartGameRequest):
    """
    Resetta completamente lo stato e avvia una nuova partita.

    - Resetta i prezzi dei titoli ai valori iniziali
    - Resetta il cash dei giocatori al valore iniziale
    - Cancella tutti i trade, eventi, impatti, portafogli, storici
    - Cancella lo stato precedente
    - Avvia una nuova partita
    """
    if request.total_cycles < 1:
        raise HTTPException(status_code=400, detail="total_cycles must be at least 1")
    return reset_game(request.total_cycles, max(0, request.extra_cycles))


@router.post("/next_cycle")
def api_next_cycle():
    """
    Avanza al ciclo successivo:
    - Genera nuovi eventi tramite LLM (mock)
    - Applica impatti ai prezzi
    - Ricalcola portafogli
    - Apre la fase decisionale
    """
    try:
        return advance_cycle()
    except GameNotFoundError:
        raise HTTPException(status_code=404, detail="No active game found")
    except InvalidPhaseError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/open_trading")
def api_open_trading():
    """
    Apre il trading ai giocatori senza generare eventi.
    Permette di comprare/vendere titoli ai prezzi iniziali.
    """
    try:
        return open_trading()
    except GameNotFoundError:
        raise HTTPException(status_code=404, detail="No active game found")
    except InvalidPhaseError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/close_phase")
def api_close_phase():
    """Chiude la fase decisionale dei giocatori."""
    try:
        return close_decision_phase()
    except GameNotFoundError:
        raise HTTPException(status_code=404, detail="No active game found")
    except InvalidPhaseError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/players")
def api_create_player(request: CreatePlayerRequest):
    """Crea un nuovo giocatore/team."""
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    conn = get_db()
    try:
        player_id = repo.create_player(conn, request.name.strip(), request.initial_cash)
        conn.commit()
        return repo.get_player(conn, player_id)
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=409, detail="Player name already exists")
        raise
    finally:
        conn.close()


@router.get("/players")
def api_get_all_players():
    """Restituisce tutti i giocatori con i rispettivi portafogli."""
    conn = get_db()
    try:
        players = repo.get_all_players(conn)
        result = []
        for player in players:
            raw_positions = repo.get_portfolio(conn, player["id"])
            # Calcola campi derivati per ogni posizione
            positions = []
            total_securities = 0.0
            for pos in raw_positions:
                current_value = pos["quantity"] * pos["current_price"]
                total_securities += current_value
                positions.append({
                    "ticker": pos["ticker"],
                    "security_name": pos.get("security_name", ""),
                    "quantity": pos["quantity"],
                    "current_price": pos["current_price"],
                    "current_value": round(current_value, 2),
                    "avg_purchase_price": pos["current_price"],  # simplified
                })

            total_value = player["current_cash"] + total_securities
            initial = player["initial_cash"] if player["initial_cash"] != 0 else 1
            performance = ((total_value - player["initial_cash"]) / initial) * 100

            result.append({
                "id": player["id"],
                "name": player["name"],
                "current_cash": player["current_cash"],
                "initial_cash": player["initial_cash"],
                "active": bool(player["active"]),
                "positions": positions,
                "total_value": round(total_value, 2),
                "performance": round(performance, 2),
            })
        return result
    finally:
        conn.close()


@router.post("/show_podium")
def api_show_podium():
    """Attiva l'animazione di fine gioco con classifica su tutti i frontend."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_podium", "1")
        conn.commit()
        return {"show_podium": True}
    finally:
        conn.close()


@router.post("/hide_podium")
def api_hide_podium():
    """Nasconde l'animazione di fine gioco."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_podium", "0")
        conn.commit()
        return {"show_podium": False}
    finally:
        conn.close()


@router.post("/show_volpe_doro")
def api_show_volpe_doro():
    """Mostra l'overlay Volpe d'Oro su tutti i frontend."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_volpe_doro", "1")
        conn.commit()
        return {"show_volpe_doro": True}
    finally:
        conn.close()


@router.post("/hide_volpe_doro")
def api_hide_volpe_doro():
    """Nasconde l'overlay Volpe d'Oro."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_volpe_doro", "0")
        conn.commit()
        return {"show_volpe_doro": False}
    finally:
        conn.close()


# ── Dietro le Quinte ──────────────────────────────────────────────

class DietroQuinteNavigate(BaseModel):
    direction: str  # "next" | "prev"


@router.post("/show_dietro_quinte")
def api_show_dietro_quinte():
    """Mostra l'overlay Dietro le Quinte e resetta alla slide 1."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_dietro_quinte", "1")
        repo.set_flag(conn, "dietro_quinte_slide", "1")
        conn.commit()
        return {"show_dietro_quinte": True, "slide": 1}
    finally:
        conn.close()


@router.post("/hide_dietro_quinte")
def api_hide_dietro_quinte():
    """Nasconde l'overlay Dietro le Quinte."""
    conn = get_db()
    try:
        repo.set_flag(conn, "show_dietro_quinte", "0")
        conn.commit()
        return {"show_dietro_quinte": False}
    finally:
        conn.close()


@router.post("/dietro_quinte_navigate")
def api_dietro_quinte_navigate(req: DietroQuinteNavigate):
    """Naviga avanti/indietro tra le slide Dietro le Quinte."""
    conn = get_db()
    try:
        current = int(repo.get_flag(conn, "dietro_quinte_slide", "1"))
        if req.direction == "next":
            new_slide = min(current + 1, 3)
        else:
            new_slide = max(current - 1, 1)
        repo.set_flag(conn, "dietro_quinte_slide", str(new_slide))
        conn.commit()
        return {"slide": new_slide}
    finally:
        conn.close()


@router.post("/update_descriptions")
def api_update_descriptions():
    """Aggiorna le descrizioni dei titoli dal seed data senza reseed completo."""
    from database.seed import SECURITIES
    conn = get_db()
    try:
        updated = 0
        for s in SECURITIES:
            conn.execute(
                "UPDATE securities SET description = ? WHERE ticker = ?",
                (s["description"], s["ticker"])
            )
            updated += 1
        conn.commit()
        return {"updated": updated}
    finally:
        conn.close()


@router.patch("/players/{player_id}")
def api_update_player(player_id: int, request: UpdatePlayerRequest):
    """Attiva o disattiva un giocatore."""
    conn = get_db()
    try:
        player = repo.get_player(conn, player_id)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        if request.active is not None:
            repo.set_player_active(conn, player_id, request.active)
        conn.commit()
        return repo.get_player(conn, player_id)
    finally:
        conn.close()
