"""
API Routes - Game & Dashboard endpoints.

Endpoint per la lettura dello stato di gioco, titoli, eventi e leaderboard.
Utilizzati da tutti i frontend.
"""

from fastapi import APIRouter, HTTPException
from backend.game.service import get_game_state, get_leaderboard, GameNotFoundError
from backend.persistence.database import get_db
from backend.persistence import repositories as repo

router = APIRouter(prefix="/api", tags=["game"])


@router.get("/game/state")
def api_game_state():
    """Restituisce lo stato corrente della partita."""
    try:
        return get_game_state()
    except GameNotFoundError:
        return {"status": "no_game", "message": "No active game found"}


@router.get("/stocks")
def api_stocks():
    """Restituisce la lista di tutti i titoli disponibili."""
    conn = get_db()
    try:
        return repo.get_all_securities(conn)
    finally:
        conn.close()


@router.get("/stocks/performance")
def api_stocks_performance():
    """
    Restituisce tutti i titoli con variazione % ciclo su ciclo (ultimo vs penultimo ciclo)
    e variazione % totale dall'inizio del gioco.
    """
    conn = get_db()
    try:
        securities = repo.get_all_securities(conn)
        result = []
        for s in securities:
            history = repo.get_security_price_history(conn, s["id"])
            cycle_change = 0.0
            if len(history) >= 2:
                prev = history[-2]["price"]
                curr = history[-1]["price"]
                if prev != 0:
                    cycle_change = round((curr - prev) / prev * 100, 2)
            total_change = 0.0
            if s["initial_price"] != 0:
                total_change = round(
                    (s["current_price"] - s["initial_price"]) / s["initial_price"] * 100, 2
                )
            result.append({
                "id": s["id"],
                "ticker": s["ticker"],
                "name": s["name"],
                "sector": s["sector"],
                "current_price": s["current_price"],
                "initial_price": s["initial_price"],
                "cycle_change_pct": cycle_change,
                "total_change_pct": total_change,
            })
        return result
    finally:
        conn.close()


@router.get("/stocks/{security_id}/history")
def api_stock_history(security_id: int):
    """Restituisce lo storico dei prezzi di un titolo."""
    conn = get_db()
    try:
        security = repo.get_security(conn, security_id)
        if not security:
            raise HTTPException(status_code=404, detail="Security not found")
        history = repo.get_security_price_history(conn, security_id)
        return {"security": security, "history": history}
    finally:
        conn.close()


@router.get("/events/current")
def api_current_events():
    """Restituisce gli eventi del ciclo corrente."""
    try:
        state = get_game_state()
    except GameNotFoundError:
        return []

    conn = get_db()
    try:
        events = repo.get_events_by_cycle(conn, state["current_cycle"])
        # Arricchisci con gli impatti
        result = []
        for event in events:
            impacts = repo.get_impacts_by_event(conn, event["id"])
            result.append({**event, "impacts": impacts})
        return result
    finally:
        conn.close()


@router.get("/events")
def api_all_events():
    """Restituisce tutti gli eventi di tutti i cicli."""
    conn = get_db()
    try:
        return repo.get_all_events(conn)
    finally:
        conn.close()


@router.get("/leaderboard")
def api_leaderboard():
    """Restituisce la classifica dei giocatori."""
    return get_leaderboard()


@router.get("/game/podium")
def api_podium():
    """Restituisce lo stato del podio (show_podium + classifica top 3)."""
    conn = get_db()
    try:
        show = repo.get_flag(conn, "show_podium", "0") == "1"
    finally:
        conn.close()
    leaderboard = get_leaderboard() if show else []
    return {"show": show, "leaderboard": leaderboard}


@router.get("/game/volpe-doro")
def api_volpe_doro():
    """Restituisce lo stato della Volpe d'Oro (show flag + dati narrativi vincitore)."""
    conn = get_db()
    try:
        show = repo.get_flag(conn, "show_volpe_doro", "0") == "1"
        winner = None
        if show:
            from backend.volpe_doro.service import get_volpe_doro_winner_narrative
            winner = get_volpe_doro_winner_narrative(conn)
        return {"show": show, "winner": winner}
    finally:
        conn.close()


@router.get("/game/dietro-quinte")
def api_dietro_quinte():
    """Restituisce lo stato dell'overlay Dietro le Quinte."""
    conn = get_db()
    try:
        show = repo.get_flag(conn, "show_dietro_quinte", "0") == "1"
        slide = int(repo.get_flag(conn, "dietro_quinte_slide", "1"))
        return {"show": show, "slide": slide}
    finally:
        conn.close()


@router.get("/events/impact-template")
def api_event_impact_template(title: str = ""):
    """Restituisce i dati template completi di un evento (impacts, persistence, cascade) dato il titolo."""
    from database.events_data import GAME_EVENTS
    decoded_title = title.strip()
    for ev in GAME_EVENTS:
        # Match esatto o per contenimento (per gestire encoding differenze)
        if ev["title"] == decoded_title or decoded_title in ev["title"] or ev["title"] in decoded_title:
            cascade = {}
            if "cascade_impacts" in ev:
                cascade = {int(k): v for k, v in ev["cascade_impacts"].items()}
            return {
                "event_id": ev["event_id"],
                "title": ev["title"],
                "category": ev["category"],
                "tone": ev.get("tone", ""),
                "origin_region": ev.get("origin_region", ""),
                "initial_intensity": ev.get("initial_intensity", ""),
                "decay_pattern": ev.get("decay_pattern", ""),
                "catastrophic": ev.get("initial_intensity") == "estrema",
                "impacts": ev["impacts"],
                "persistence": {int(k): v for k, v in ev["persistence"].items()},
                "cascade": cascade,
                "variable_updates": ev.get("variable_updates", {}),
            }
    raise HTTPException(status_code=404, detail="Event template not found")
