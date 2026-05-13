"""
Database module - Gestione connessione SQLite e inizializzazione schema.

Responsabilita':
- Creare e gestire la connessione al database SQLite
- Inizializzare tutte le tabelle dello schema
- Fornire un context manager per le transazioni
"""

import sqlite3
import os

# Path del database - relativo alla cartella /database del progetto
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "database")
DB_PATH = os.path.join(DB_DIR, "game.db")


def get_db() -> sqlite3.Connection:
    """Restituisce una connessione al database SQLite con row_factory attivo."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """
    Inizializza tutte le tabelle del database.
    Crea le tabelle solo se non esistono gia'.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Tabella stato globale di gioco (singola partita per istanza)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_state (
            id INTEGER PRIMARY KEY DEFAULT 1,
            current_cycle INTEGER NOT NULL DEFAULT 0,
            total_cycles INTEGER NOT NULL DEFAULT 5,
            extra_cycles INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'setup'
                CHECK(status IN ('setup', 'events_generated', 'decision', 'closed', 'finished'))
        )
    """)

    # Tabella giocatori
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            initial_cash REAL NOT NULL DEFAULT 100000.0,
            current_cash REAL NOT NULL DEFAULT 100000.0,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Tabella titoli (securities) con metriche fondamentali
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS securities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            sector TEXT NOT NULL,
            region TEXT NOT NULL,
            initial_price REAL NOT NULL,
            current_price REAL NOT NULL,
            market_cap REAL DEFAULT 0,
            pe_ratio REAL DEFAULT 0,
            eps REAL DEFAULT 0,
            dividend_yield REAL DEFAULT 0,
            roi REAL DEFAULT 0,
            roe REAL DEFAULT 0,
            target_price REAL DEFAULT 0,
            risk_level REAL DEFAULT 0,
            open_price REAL DEFAULT 0,
            close_price REAL DEFAULT 0,
            bid REAL DEFAULT 0,
            ask REAL DEFAULT 0,
            beta REAL DEFAULT 1.0,
            revenue REAL DEFAULT 0,
            ebitda REAL DEFAULT 0,
            annual_performance REAL DEFAULT 0,
            -- Valori iniziali per il reset della partita
            initial_market_cap REAL DEFAULT 0,
            initial_revenue REAL DEFAULT 0,
            initial_ebitda REAL DEFAULT 0,
            initial_eps REAL DEFAULT 0,
            initial_pe_ratio REAL DEFAULT 0,
            initial_roi REAL DEFAULT 0,
            initial_roe REAL DEFAULT 0,
            initial_target_price REAL DEFAULT 0
        )
    """)

    # Storico prezzi per ciclo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS securities_price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            security_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (security_id) REFERENCES securities(id)
        )
    """)

    # Portafogli correnti (posizioni aperte)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            security_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (security_id) REFERENCES securities(id),
            UNIQUE(player_id, security_id)
        )
    """)

    # Storico valore portafogli per ciclo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolio_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            total_value REAL NOT NULL,
            FOREIGN KEY (player_id) REFERENCES players(id)
        )
    """)

    # Storico operazioni (trades)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            security_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
            quantity INTEGER NOT NULL,
            price_at_execution REAL NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (security_id) REFERENCES securities(id)
        )
    """)

    # Template eventi (specifiche definite dal team)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            target_sector TEXT,
            target_region TEXT,
            intensity_level TEXT NOT NULL DEFAULT 'medium'
                CHECK(intensity_level IN ('low', 'medium', 'high')),
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Eventi generati per ogni ciclo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_cycle INTEGER NOT NULL,
            template_id INTEGER,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            category TEXT NOT NULL,
            tone TEXT,
            scope TEXT,
            origin_region TEXT,
            initial_intensity TEXT,
            duration_class TEXT,
            propagation TEXT,
            decay_pattern TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (template_id) REFERENCES event_templates(id)
        )
    """)

    # Impatti degli eventi sui titoli/settori/regioni
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_impacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            security_id INTEGER,
            sector TEXT,
            region TEXT,
            impact_type TEXT NOT NULL DEFAULT 'multiplier'
                CHECK(impact_type IN ('multiplier', 'delta_percent')),
            impact_value REAL NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (security_id) REFERENCES securities(id)
        )
    """)

    # Registro eventi di gioco gia' utilizzati (per evitare ripetizioni)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS used_game_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            cycle_number INTEGER NOT NULL
        )
    """)

    # Impatti pendenti da eventi precedenti (decay multi-ciclo)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_impacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_event_db_id INTEGER NOT NULL,
            target_cycle INTEGER NOT NULL,
            security_id INTEGER NOT NULL,
            impact_pct REAL NOT NULL,
            applied INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (source_event_db_id) REFERENCES events(id),
            FOREIGN KEY (security_id) REFERENCES securities(id)
        )
    """)

    # Flags globali di gioco (es. show_podium)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_flags (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT '0'
        )
    """)

    # Variabili interne per titolo (12 variabili astratte, solo motore)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_internal_variables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            security_id INTEGER NOT NULL,
            variable_name TEXT NOT NULL,
            current_value REAL NOT NULL DEFAULT 50.0,
            initial_value REAL NOT NULL DEFAULT 50.0,
            FOREIGN KEY (security_id) REFERENCES securities(id),
            UNIQUE(security_id, variable_name)
        )
    """)

    # Storico drift strutturale per ciclo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS baseline_drift_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            security_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            drift_pct REAL NOT NULL,
            FOREIGN KEY (security_id) REFERENCES securities(id)
        )
    """)

    # Punteggi Volpe d'Oro per ciclo (premio lettura eventi)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS volpe_doro_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            component_1 REAL NOT NULL DEFAULT 0,
            component_2 REAL NOT NULL DEFAULT 0,
            component_3 REAL NOT NULL DEFAULT 0,
            component_4 REAL NOT NULL DEFAULT 0,
            raw_total REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES players(id),
            UNIQUE(player_id, cycle_number)
        )
    """)

    # Migrazione incrementale: aggiungi colonne events se mancanti
    for col in ["tone", "scope", "origin_region", "initial_intensity",
                "duration_class", "propagation", "decay_pattern"]:
        try:
            cursor.execute(f"ALTER TABLE events ADD COLUMN {col} TEXT")
        except sqlite3.OperationalError:
            pass  # colonna gia' esistente

    # Migrazione: aggiungi extra_cycles a game_state se mancante
    try:
        cursor.execute("ALTER TABLE game_state ADD COLUMN extra_cycles INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # colonna gia' esistente

    # Migrazione: aggiungi catastrophic a events se mancante
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN catastrophic INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # colonna gia' esistente

    conn.commit()
    conn.close()
