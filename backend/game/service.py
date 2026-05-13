"""
Game Service - Logica di stato partita, cicli e leaderboard.

Responsabilita':
- Gestione dello stato globale della partita (setup -> running -> finished)
- Orchestrazione dei cicli: generazione eventi, applicazione impatti, snapshot
- Calcolo della leaderboard

Diagramma stati:
  SETUP -> EVENTS_GENERATED -> DECISION -> CLOSED -> (ripete o FINISHED)
"""

from backend.persistence.database import get_db
from backend.persistence import repositories as repo
from backend.event_mgmt.service import generate_events_for_cycle
from backend.impact.service import apply_impacts, save_cycle_snapshot
from backend.drift.service import apply_baseline_drift


class GameNotFoundError(Exception):
    pass


class InvalidPhaseError(Exception):
    pass


def reset_game(total_cycles: int = 5, extra_cycles: int = 0) -> dict:
    """
    Resetta completamente il gioco e avvia una nuova partita.

    - Cancella eventi, impatti, trade, portafogli, storici
    - Resetta i prezzi dei titoli ai valori iniziali
    - Resetta il cash dei giocatori al valore iniziale
    - Crea un nuovo game_state
    """
    conn = get_db()
    try:
        # Cancella in ordine per rispettare foreign keys
        conn.execute("DELETE FROM pending_impacts")
        conn.execute("DELETE FROM used_game_events")
        conn.execute("DELETE FROM event_impacts")
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM trades")
        conn.execute("DELETE FROM portfolios")
        conn.execute("DELETE FROM portfolio_history")
        conn.execute("DELETE FROM securities_price_history WHERE cycle_number >= 0")  # preserva storico pre-game (cicli negativi)
        conn.execute("DELETE FROM game_state")

        # Cancella nuove tabelle (drift e variabili interne)
        try:
            conn.execute("DELETE FROM baseline_drift_history")
        except Exception:
            pass
        try:
            repo.reset_internal_variables(conn)
        except Exception:
            pass

        # Resetta flags
        conn.execute("UPDATE game_flags SET value = '0' WHERE key = 'show_podium'")
        conn.execute("UPDATE game_flags SET value = '0' WHERE key = 'show_volpe_doro'")

        # Cancella punteggi Volpe d'Oro
        try:
            conn.execute("DELETE FROM volpe_doro_scores")
        except Exception:
            pass

        # Resetta prezzi ai valori iniziali (sempre disponibili)
        conn.execute("""
            UPDATE securities SET
                current_price = initial_price,
                open_price    = initial_price,
                close_price   = initial_price,
                bid           = ROUND(initial_price * 0.999, 2),
                ask           = ROUND(initial_price * 1.001, 2)
        """)
        # Resetta fondamentali dai valori iniziali (disponibili solo dopo re-seed con colonne initial_*)
        try:
            conn.execute("""
                UPDATE securities SET
                    market_cap   = initial_market_cap,
                    revenue      = initial_revenue,
                    ebitda       = initial_ebitda,
                    eps          = initial_eps,
                    pe_ratio     = initial_pe_ratio,
                    roi          = initial_roi,
                    roe          = initial_roe,
                    target_price = initial_target_price
            """)
        except Exception:
            pass  # DB pre-existing senza colonne initial_*

        # Resetta il cash di tutti i giocatori al valore iniziale
        conn.execute("UPDATE players SET current_cash = initial_cash")

        conn.commit()
    finally:
        conn.close()

    # Ora avvia normalmente la nuova partita
    return start_game(total_cycles, extra_cycles)


def start_game(total_cycles: int = 5, extra_cycles: int = 0) -> dict:
    """
    Inizializza una nuova partita.

    - Crea il record game_state con status='setup'
    - Salva lo snapshot iniziale dei portafogli (ciclo 0)
    - Salva i prezzi iniziali nello storico (ciclo 0)
    - total_cycles: cicli con generazione eventi
    - extra_cycles: cicli aggiuntivi senza eventi (solo drift + persistenza impatti)
    """
    conn = get_db()
    try:
        repo.create_game_state(conn, total_cycles, extra_cycles)

        # Salva snapshot prezzi iniziali (ciclo 0)
        securities = repo.get_all_securities(conn)
        for s in securities:
            repo.save_price_history(conn, s["id"], 0, s["current_price"])

        # Salva snapshot portafogli iniziali (ciclo 0)
        players = repo.get_all_players(conn)
        for player in players:
            if not player["active"]:
                continue
            positions = repo.get_portfolio(conn, player["id"])
            total_securities = sum(
                pos["quantity"] * pos["current_price"] for pos in positions
            )
            total_value = player["current_cash"] + total_securities
            repo.save_portfolio_history(conn, player["id"], 0, round(total_value, 2))

        conn.commit()
        return repo.get_game_state(conn)
    finally:
        conn.close()


def get_game_state() -> dict:
    """Restituisce lo stato corrente della partita."""
    conn = get_db()
    try:
        state = repo.get_game_state(conn)
        if not state:
            raise GameNotFoundError("No active game found")
        return state
    finally:
        conn.close()


def open_trading() -> dict:
    """
    Apre la fase di trading senza generare eventi.

    Permette ai giocatori di comprare/vendere titoli ai prezzi correnti
    prima che vengano generati gli eventi del primo ciclo.
    Transizione: setup -> decision
    """
    conn = get_db()
    try:
        state = repo.get_game_state(conn)
        if not state:
            raise GameNotFoundError("No active game found")

        if state["status"] != "setup":
            raise InvalidPhaseError(
                f"Cannot open trading in phase '{state['status']}'. Must be 'setup'."
            )

        repo.update_game_state(conn, status="decision")
        conn.commit()
        return repo.get_game_state(conn)
    finally:
        conn.close()


def advance_cycle() -> dict:
    """
    Avanza al ciclo successivo:
    1. Verifica che la partita sia in fase 'setup' o 'closed'
    2. Incrementa il numero di ciclo
    3. Genera gli eventi tramite il modulo event_mgmt -> LLM
    4. Applica gli impatti ai prezzi e portafogli tramite il modulo impact
    5. Aggiorna lo stato a 'events_generated', poi 'decision'

    Restituisce lo stato aggiornato.
    """
    conn = get_db()
    try:
        state = repo.get_game_state(conn)
        if not state:
            raise GameNotFoundError("No active game found")

        if state["status"] not in ("setup", "closed"):
            raise InvalidPhaseError(
                f"Cannot advance cycle in phase '{state['status']}'. Must be 'setup' or 'closed'."
            )

        total_game_cycles = state["total_cycles"] + state.get("extra_cycles", 0)
        if state["status"] == "closed" and state["current_cycle"] >= total_game_cycles:
            raise InvalidPhaseError("Game has reached maximum cycles. Game is finished.")

        # Incrementa il ciclo
        new_cycle = state["current_cycle"] + 1
        repo.update_game_state(conn, current_cycle=new_cycle, status="events_generated")
        conn.commit()
    finally:
        conn.close()

    # Genera eventi solo nei cicli con eventi (1..total_cycles)
    # Nei cicli extra (total_cycles+1..total_cycles+extra_cycles) solo drift + persistenza
    conn2 = get_db()
    try:
        state2 = repo.get_game_state(conn2)
    finally:
        conn2.close()

    is_event_cycle = new_cycle <= (state2["total_cycles"] if state2 else new_cycle)
    if is_event_cycle:
        generate_events_for_cycle(new_cycle)

    # Calcola il drift baseline per tutti i titoli (usa propria connessione)
    apply_baseline_drift(new_cycle)

    # Applica impatti ai prezzi e portafogli, integrati col drift (usa propria connessione)
    apply_impacts(new_cycle)

    # Calcola punteggio Volpe d'Oro per le trade del ciclo precedente
    # (valutate contro i prezzi appena aggiornati del ciclo corrente)
    if new_cycle >= 2:
        try:
            from backend.volpe_doro.service import compute_cycle_score
            vd_conn = get_db()
            try:
                players = repo.get_all_players(vd_conn)
                for player in players:
                    if player["active"]:
                        compute_cycle_score(player["id"], new_cycle - 1, vd_conn)
                vd_conn.commit()
            finally:
                vd_conn.close()
        except Exception as e:
            print(f"WARN: Volpe d'Oro scoring failed for cycle {new_cycle - 1}: {e}")

    # Aggiorna stato a 'decision' per permettere ai giocatori di operare
    conn = get_db()
    try:
        repo.update_game_state(conn, status="decision")
        conn.commit()
        return repo.get_game_state(conn)
    finally:
        conn.close()


def close_decision_phase() -> dict:
    """
    Chiude la fase decisionale.

    - Verifica che lo stato sia 'decision'
    - Salva un eventuale snapshot finale
    - Se il ciclo corrente == total_cycles, termina la partita
    """
    conn = get_db()
    try:
        state = repo.get_game_state(conn)
        if not state:
            raise GameNotFoundError("No active game found")

        if state["status"] != "decision":
            raise InvalidPhaseError(
                f"Cannot close decision phase in state '{state['status']}'. Must be 'decision'."
            )

        # Se e' l'ultimo ciclo (eventi + extra), la partita e' finita
        total_game_cycles = state["total_cycles"] + state.get("extra_cycles", 0)
        if state["current_cycle"] >= total_game_cycles:
            # Calcola classifica finale Volpe d'Oro
            try:
                from backend.volpe_doro.service import compute_final_volpe_doro
                compute_final_volpe_doro(conn)
            except Exception as e:
                print(f"WARN: Volpe d'Oro final computation failed: {e}")
            repo.update_game_state(conn, status="finished")
        else:
            repo.update_game_state(conn, status="closed")

        conn.commit()
        return repo.get_game_state(conn)
    finally:
        conn.close()


def get_leaderboard() -> list[dict]:
    """
    Calcola la classifica dei giocatori.

    Per ogni giocatore attivo:
    - Calcola il valore totale del portafoglio (cash + titoli)
    - Calcola la performance rispetto al cash iniziale
    - Ordina per valore totale decrescente
    """
    conn = get_db()
    try:
        players = repo.get_all_players(conn)
        leaderboard = []

        for player in players:
            if not player["active"]:
                continue

            positions = repo.get_portfolio(conn, player["id"])
            total_securities = sum(
                pos["quantity"] * pos["current_price"] for pos in positions
            )
            total_value = player["current_cash"] + total_securities
            performance = ((total_value - player["initial_cash"]) / player["initial_cash"]) * 100

            leaderboard.append({
                "player_id": player["id"],
                "name": player["name"],
                "cash": round(player["current_cash"], 2),
                "securities_value": round(total_securities, 2),
                "total_value": round(total_value, 2),
                "initial_cash": player["initial_cash"],
                "performance": round(performance, 2),
            })

        # Ordina per valore totale decrescente
        leaderboard.sort(key=lambda x: x["total_value"], reverse=True)

        # Aggiungi posizione in classifica
        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1

        return leaderboard
    finally:
        conn.close()
