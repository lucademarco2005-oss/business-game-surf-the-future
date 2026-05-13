"""
Repository module - CRUD operations per tutte le entita' del database.

Ogni funzione accetta una connessione SQLite come primo argomento,
permettendo la gestione delle transazioni a livello superiore.
"""

import sqlite3
from datetime import datetime
from typing import Optional


# ─── GAME STATE ──────────────────────────────────────────────

def get_game_state(conn: sqlite3.Connection) -> Optional[dict]:
    """Restituisce lo stato corrente della partita."""
    row = conn.execute("SELECT * FROM game_state WHERE id = 1").fetchone()
    return dict(row) if row else None


def create_game_state(conn: sqlite3.Connection, total_cycles: int, extra_cycles: int = 0):
    """Crea lo stato iniziale della partita."""
    conn.execute("DELETE FROM game_state")
    conn.execute(
        "INSERT INTO game_state (id, current_cycle, total_cycles, extra_cycles, status) VALUES (1, 0, ?, ?, 'setup')",
        (total_cycles, extra_cycles)
    )


def update_game_state(conn: sqlite3.Connection, **kwargs):
    """Aggiorna campi dello stato partita. Accetta: current_cycle, total_cycles, extra_cycles, status."""
    allowed = {"current_cycle", "total_cycles", "extra_cycles", "status"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values())
    conn.execute(f"UPDATE game_state SET {set_clause} WHERE id = 1", values)


# ─── PLAYERS ─────────────────────────────────────────────────

def create_player(conn: sqlite3.Connection, name: str, initial_cash: float = 100000.0) -> int:
    """Crea un nuovo giocatore e restituisce il suo ID."""
    cursor = conn.execute(
        "INSERT INTO players (name, initial_cash, current_cash) VALUES (?, ?, ?)",
        (name, initial_cash, initial_cash)
    )
    return cursor.lastrowid


def get_player(conn: sqlite3.Connection, player_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    return dict(row) if row else None


def get_all_players(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM players ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def update_player_cash(conn: sqlite3.Connection, player_id: int, new_cash: float):
    conn.execute("UPDATE players SET current_cash = ? WHERE id = ?", (new_cash, player_id))


def set_player_active(conn: sqlite3.Connection, player_id: int, active: bool):
    conn.execute("UPDATE players SET active = ? WHERE id = ?", (1 if active else 0, player_id))


# ─── SECURITIES ──────────────────────────────────────────────

def get_all_securities(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM securities ORDER BY ticker").fetchall()
    return [dict(r) for r in rows]


def get_security(conn: sqlite3.Connection, security_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM securities WHERE id = ?", (security_id,)).fetchone()
    return dict(row) if row else None


def get_security_by_ticker(conn: sqlite3.Connection, ticker: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM securities WHERE ticker = ?", (ticker,)).fetchone()
    return dict(row) if row else None


def update_security_price(conn: sqlite3.Connection, security_id: int, new_price: float):
    conn.execute("UPDATE securities SET current_price = ? WHERE id = ?", (new_price, security_id))


def get_security_price_history(conn: sqlite3.Connection, security_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM securities_price_history WHERE security_id = ? ORDER BY cycle_number",
        (security_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def save_price_history(conn: sqlite3.Connection, security_id: int, cycle_number: int, price: float):
    conn.execute(
        "INSERT INTO securities_price_history (security_id, cycle_number, price) VALUES (?, ?, ?)",
        (security_id, cycle_number, price)
    )


# ─── PORTFOLIOS ──────────────────────────────────────────────

def get_portfolio(conn: sqlite3.Connection, player_id: int) -> list[dict]:
    """Restituisce le posizioni correnti di un giocatore (solo quantita' > 0)."""
    rows = conn.execute(
        """SELECT p.*, s.ticker, s.name as security_name, s.current_price, s.sector, s.beta, s.risk_level
           FROM portfolios p
           JOIN securities s ON p.security_id = s.id
           WHERE p.player_id = ? AND p.quantity > 0
           ORDER BY s.ticker""",
        (player_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def get_portfolio_position(conn: sqlite3.Connection, player_id: int, security_id: int) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM portfolios WHERE player_id = ? AND security_id = ?",
        (player_id, security_id)
    ).fetchone()
    return dict(row) if row else None


def upsert_portfolio_position(conn: sqlite3.Connection, player_id: int, security_id: int, quantity: int):
    """Inserisce o aggiorna la posizione di un giocatore su un titolo."""
    existing = get_portfolio_position(conn, player_id, security_id)
    if existing:
        conn.execute(
            "UPDATE portfolios SET quantity = ? WHERE player_id = ? AND security_id = ?",
            (quantity, player_id, security_id)
        )
    else:
        conn.execute(
            "INSERT INTO portfolios (player_id, security_id, quantity) VALUES (?, ?, ?)",
            (player_id, security_id, quantity)
        )


def get_portfolio_history(conn: sqlite3.Connection, player_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM portfolio_history WHERE player_id = ? ORDER BY cycle_number",
        (player_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def save_portfolio_history(conn: sqlite3.Connection, player_id: int, cycle_number: int, total_value: float):
    conn.execute(
        "INSERT INTO portfolio_history (player_id, cycle_number, total_value) VALUES (?, ?, ?)",
        (player_id, cycle_number, total_value)
    )


# ─── TRADES ──────────────────────────────────────────────────

def create_trade(conn: sqlite3.Connection, player_id: int, security_id: int,
                 cycle_number: int, trade_type: str, quantity: int, price: float) -> int:
    cursor = conn.execute(
        """INSERT INTO trades (player_id, security_id, cycle_number, type, quantity,
           price_at_execution, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (player_id, security_id, cycle_number, trade_type, quantity, price,
         datetime.now().isoformat())
    )
    return cursor.lastrowid


def get_player_trades(conn: sqlite3.Connection, player_id: int) -> list[dict]:
    rows = conn.execute(
        """SELECT t.*, s.ticker, s.name as security_name
           FROM trades t
           JOIN securities s ON t.security_id = s.id
           WHERE t.player_id = ?
           ORDER BY t.timestamp DESC""",
        (player_id,)
    ).fetchall()
    return [dict(r) for r in rows]


# ─── EVENT TEMPLATES ─────────────────────────────────────────

def create_event_template(conn: sqlite3.Connection, name: str, description: str,
                          category: str, target_sector: str = None,
                          target_region: str = None, intensity_level: str = "medium") -> int:
    cursor = conn.execute(
        """INSERT INTO event_templates (name, description, category, target_sector,
           target_region, intensity_level) VALUES (?, ?, ?, ?, ?, ?)""",
        (name, description, category, target_sector, target_region, intensity_level)
    )
    return cursor.lastrowid


def get_all_event_templates(conn: sqlite3.Connection, active_only: bool = False) -> list[dict]:
    query = "SELECT * FROM event_templates"
    if active_only:
        query += " WHERE active = 1"
    query += " ORDER BY id"
    rows = conn.execute(query).fetchall()
    return [dict(r) for r in rows]


def get_event_template(conn: sqlite3.Connection, template_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM event_templates WHERE id = ?", (template_id,)).fetchone()
    return dict(row) if row else None


def update_event_template(conn: sqlite3.Connection, template_id: int, **kwargs) -> bool:
    allowed = {"name", "description", "category", "target_sector", "target_region",
               "intensity_level", "active"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return False
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [template_id]
    conn.execute(f"UPDATE event_templates SET {set_clause} WHERE id = ?", values)
    return True


def delete_event_template(conn: sqlite3.Connection, template_id: int):
    """Soft delete: disattiva il template."""
    conn.execute("UPDATE event_templates SET active = 0 WHERE id = ?", (template_id,))


# ─── EVENTS ──────────────────────────────────────────────────

def create_event(conn: sqlite3.Connection, game_cycle: int, title: str, body: str,
                 category: str, template_id: int = None,
                 tone: str = None, scope: str = None, origin_region: str = None,
                 initial_intensity: str = None, duration_class: str = None,
                 propagation: str = None, decay_pattern: str = None,
                 catastrophic: int = 0) -> int:
    cursor = conn.execute(
        """INSERT INTO events (game_cycle, template_id, title, body, category,
           tone, scope, origin_region, initial_intensity, duration_class,
           propagation, decay_pattern, catastrophic, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (game_cycle, template_id, title, body, category,
         tone, scope, origin_region, initial_intensity, duration_class,
         propagation, decay_pattern, catastrophic, datetime.now().isoformat())
    )
    return cursor.lastrowid


def get_events_by_cycle(conn: sqlite3.Connection, cycle_number: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM events WHERE game_cycle = ? ORDER BY created_at",
        (cycle_number,)
    ).fetchall()
    return [dict(r) for r in rows]


def get_all_events(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM events ORDER BY game_cycle, created_at").fetchall()
    return [dict(r) for r in rows]


# ─── EVENT IMPACTS ───────────────────────────────────────────

def create_event_impact(conn: sqlite3.Connection, event_id: int, impact_type: str,
                        impact_value: float, security_id: int = None,
                        sector: str = None, region: str = None) -> int:
    cursor = conn.execute(
        """INSERT INTO event_impacts (event_id, security_id, sector, region, impact_type, impact_value)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (event_id, security_id, sector, region, impact_type, impact_value)
    )
    return cursor.lastrowid


def get_impacts_by_event(conn: sqlite3.Connection, event_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM event_impacts WHERE event_id = ?", (event_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def get_impacts_by_cycle(conn: sqlite3.Connection, cycle_number: int) -> list[dict]:
    rows = conn.execute(
        """SELECT ei.*, e.catastrophic FROM event_impacts ei
           JOIN events e ON ei.event_id = e.id
           WHERE e.game_cycle = ?""",
        (cycle_number,)
    ).fetchall()
    return [dict(r) for r in rows]


# ─── SECURITY FUNDAMENTALS ──────────────────────────────────

def update_security_fundamentals(conn: sqlite3.Connection, security_id: int, **kwargs):
    """Aggiorna i fondamentali di un titolo. Accetta qualsiasi colonna fondamentale."""
    allowed = {"market_cap", "pe_ratio", "eps", "roi", "roe", "target_price",
               "revenue", "ebitda", "open_price", "close_price", "bid", "ask"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [security_id]
    conn.execute(f"UPDATE securities SET {set_clause} WHERE id = ?", values)


# ─── USED GAME EVENTS ───────────────────────────────────────

def get_used_event_ids(conn: sqlite3.Connection) -> list[str]:
    """Restituisce gli event_id (es. '1.1', '2.3') gia' usati nella partita corrente."""
    rows = conn.execute("SELECT event_id FROM used_game_events ORDER BY id").fetchall()
    return [r["event_id"] for r in rows]


def mark_event_used(conn: sqlite3.Connection, event_id: str, cycle_number: int):
    """Segna un evento come utilizzato."""
    conn.execute(
        "INSERT INTO used_game_events (event_id, cycle_number) VALUES (?, ?)",
        (event_id, cycle_number)
    )


def clear_used_events(conn: sqlite3.Connection):
    """Cancella tutti gli eventi usati (per reset partita)."""
    conn.execute("DELETE FROM used_game_events")


# ─── PENDING IMPACTS (DECAY) ────────────────────────────────

def create_pending_impact(conn: sqlite3.Connection, source_event_db_id: int,
                          target_cycle: int, security_id: int, impact_pct: float):
    """Crea un impatto pendente (decay) per un ciclo futuro."""
    conn.execute(
        """INSERT INTO pending_impacts (source_event_db_id, target_cycle, security_id, impact_pct)
           VALUES (?, ?, ?, ?)""",
        (source_event_db_id, target_cycle, security_id, impact_pct)
    )


def get_pending_impacts_for_cycle(conn: sqlite3.Connection, cycle_number: int) -> list[dict]:
    """Restituisce tutti gli impatti pendenti da applicare nel ciclo specificato."""
    rows = conn.execute(
        """SELECT pi.*, COALESCE(e.catastrophic, 0) as catastrophic
           FROM pending_impacts pi
           LEFT JOIN events e ON pi.source_event_db_id = e.id
           WHERE pi.target_cycle = ? AND pi.applied = 0""",
        (cycle_number,)
    ).fetchall()
    return [dict(r) for r in rows]


def mark_pending_impacts_applied(conn: sqlite3.Connection, cycle_number: int):
    """Segna come applicati tutti gli impatti pendenti del ciclo."""
    conn.execute(
        "UPDATE pending_impacts SET applied = 1 WHERE target_cycle = ?",
        (cycle_number,)
    )


def clear_all_pending_impacts(conn: sqlite3.Connection):
    """Cancella tutti gli impatti pendenti (per reset partita)."""
    conn.execute("DELETE FROM pending_impacts")


# ─── GAME FLAGS ──────────────────────────────────────────────

def get_flag(conn: sqlite3.Connection, key: str, default: str = "0") -> str:
    """Restituisce il valore di un flag globale."""
    row = conn.execute("SELECT value FROM game_flags WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_flag(conn: sqlite3.Connection, key: str, value: str):
    """Imposta un flag globale (upsert)."""
    conn.execute(
        "INSERT INTO game_flags (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value)
    )


# ─── SECURITY INTERNAL VARIABLES ──────────────────────────────

def get_internal_variables(conn: sqlite3.Connection, security_id: int) -> dict:
    """Restituisce {variable_name: current_value} per un titolo."""
    rows = conn.execute(
        "SELECT variable_name, current_value FROM security_internal_variables WHERE security_id = ?",
        (security_id,)
    ).fetchall()
    return {r["variable_name"]: r["current_value"] for r in rows}


def get_all_internal_variables(conn: sqlite3.Connection) -> dict:
    """Restituisce {security_id: {variable_name: current_value}} per tutti i titoli."""
    rows = conn.execute(
        "SELECT security_id, variable_name, current_value FROM security_internal_variables"
    ).fetchall()
    result = {}
    for r in rows:
        sid = r["security_id"]
        if sid not in result:
            result[sid] = {}
        result[sid][r["variable_name"]] = r["current_value"]
    return result


def update_internal_variable(conn: sqlite3.Connection, security_id: int,
                             variable_name: str, new_value: float):
    """Aggiorna una variabile interna di un titolo."""
    conn.execute(
        """UPDATE security_internal_variables
           SET current_value = ?
           WHERE security_id = ? AND variable_name = ?""",
        (new_value, security_id, variable_name)
    )


def batch_update_internal_variables(conn: sqlite3.Connection, security_id: int,
                                    updates: dict):
    """Aggiorna piu' variabili interne per un titolo. updates = {nome: delta}."""
    for var_name, delta in updates.items():
        if abs(delta) < 0.001:
            continue
        conn.execute(
            """UPDATE security_internal_variables
               SET current_value = MAX(0, MIN(100, current_value + ?))
               WHERE security_id = ? AND variable_name = ?""",
            (delta, security_id, var_name)
        )


def reset_internal_variables(conn: sqlite3.Connection):
    """Resetta tutte le variabili interne ai valori iniziali."""
    conn.execute("UPDATE security_internal_variables SET current_value = initial_value")


def init_internal_variables(conn: sqlite3.Connection, security_id: int, variables: list):
    """Inizializza le variabili interne per un titolo (INSERT OR IGNORE)."""
    for var_name in variables:
        conn.execute(
            """INSERT OR IGNORE INTO security_internal_variables
               (security_id, variable_name, current_value, initial_value)
               VALUES (?, ?, 50.0, 50.0)""",
            (security_id, var_name)
        )


# ─── BASELINE DRIFT HISTORY ──────────────────────────────────

def save_baseline_drift(conn: sqlite3.Connection, security_id: int,
                        cycle_number: int, drift_pct: float):
    """Salva il drift strutturale calcolato per un titolo in un ciclo."""
    conn.execute(
        "INSERT INTO baseline_drift_history (security_id, cycle_number, drift_pct) VALUES (?, ?, ?)",
        (security_id, cycle_number, drift_pct)
    )


def get_baseline_drifts_for_cycle(conn: sqlite3.Connection, cycle_number: int) -> dict:
    """Restituisce {security_id: drift_pct} per un ciclo."""
    rows = conn.execute(
        "SELECT security_id, drift_pct FROM baseline_drift_history WHERE cycle_number = ?",
        (cycle_number,)
    ).fetchall()
    return {r["security_id"]: r["drift_pct"] for r in rows}


def clear_baseline_drift_history(conn: sqlite3.Connection):
    """Cancella tutto lo storico drift (per reset partita)."""
    conn.execute("DELETE FROM baseline_drift_history")


# ─── VOLPE D'ORO ────────────────────────────────────────────

def save_volpe_doro_score(conn: sqlite3.Connection, player_id: int,
                          cycle_number: int, c1: float, c2: float,
                          c3: float, c4: float, raw_total: float):
    """Salva (upsert) il punteggio Volpe d'Oro per un giocatore in un ciclo."""
    conn.execute(
        """INSERT INTO volpe_doro_scores
           (player_id, cycle_number, component_1, component_2, component_3, component_4, raw_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(player_id, cycle_number)
           DO UPDATE SET component_1=excluded.component_1,
                         component_2=excluded.component_2,
                         component_3=excluded.component_3,
                         component_4=excluded.component_4,
                         raw_total=excluded.raw_total""",
        (player_id, cycle_number, round(c1, 2), round(c2, 2),
         round(c3, 2), round(c4, 2), round(raw_total, 2))
    )


def get_volpe_doro_scores_by_player(conn: sqlite3.Connection, player_id: int) -> list:
    """Restituisce tutti i punteggi ciclo di un giocatore."""
    rows = conn.execute(
        "SELECT * FROM volpe_doro_scores WHERE player_id = ? ORDER BY cycle_number",
        (player_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def get_all_volpe_doro_final(conn: sqlite3.Connection) -> list:
    """Restituisce il punteggio medio per giocatore, ordinato decrescente."""
    rows = conn.execute(
        """SELECT v.player_id, p.name,
                  ROUND(AVG(v.component_1), 2) as avg_c1,
                  ROUND(AVG(v.component_2), 2) as avg_c2,
                  ROUND(AVG(v.component_3), 2) as avg_c3,
                  ROUND(AVG(v.component_4), 2) as avg_c4,
                  ROUND(AVG(v.raw_total), 2) as avg_total,
                  COUNT(v.cycle_number) as cycles_scored
           FROM volpe_doro_scores v
           JOIN players p ON v.player_id = p.id
           GROUP BY v.player_id
           ORDER BY avg_total DESC"""
    ).fetchall()
    return [dict(r) for r in rows]


def get_trades_by_player_cycle(conn: sqlite3.Connection, player_id: int,
                                cycle_number: int) -> list:
    """Restituisce le trade di un giocatore in un ciclo specifico."""
    rows = conn.execute(
        """SELECT t.*, s.ticker, s.sector
           FROM trades t
           JOIN securities s ON t.security_id = s.id
           WHERE t.player_id = ? AND t.cycle_number = ?
           ORDER BY t.timestamp""",
        (player_id, cycle_number)
    ).fetchall()
    return [dict(r) for r in rows]


def get_price_at_cycle(conn: sqlite3.Connection, security_id: int,
                       cycle_number: int):
    """Restituisce il prezzo di un titolo ad un ciclo specifico."""
    row = conn.execute(
        "SELECT price FROM securities_price_history WHERE security_id = ? AND cycle_number = ?",
        (security_id, cycle_number)
    ).fetchone()
    return row["price"] if row else None


def get_all_prices_at_cycle(conn: sqlite3.Connection, cycle_number: int) -> dict:
    """Restituisce {security_id: price} per tutti i titoli ad un ciclo."""
    rows = conn.execute(
        "SELECT security_id, price FROM securities_price_history WHERE cycle_number = ?",
        (cycle_number,)
    ).fetchall()
    return {r["security_id"]: r["price"] for r in rows}


def get_portfolio_positions(conn: sqlite3.Connection, player_id: int) -> list:
    """Restituisce le posizioni correnti di un giocatore con ticker e settore."""
    rows = conn.execute(
        """SELECT p.security_id, p.quantity, s.ticker, s.sector
           FROM portfolios p
           JOIN securities s ON p.security_id = s.id
           WHERE p.player_id = ? AND p.quantity > 0""",
        (player_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def clear_volpe_doro_scores(conn: sqlite3.Connection):
    """Cancella tutti i punteggi Volpe d'Oro (per reset partita)."""
    conn.execute("DELETE FROM volpe_doro_scores")
