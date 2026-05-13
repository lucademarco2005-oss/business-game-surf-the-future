"""
Event Management Service - Selezione eventi dal pool e generazione impatti.

Responsabilita':
- Selezionare 3 eventi casuali non ripetuti dal pool di 23 eventi
- Salvare eventi e impatti per-titolo nel database (con 7-layer metadata)
- Creare impatti pendenti (decay per-evento) per i cicli successivi
- Creare cascade_impacts (effetti domino amplificati) per eventi catastrofici
- Aggiornare le variabili interne in base all'evento
"""

import random
from backend.persistence.database import get_db
from backend.persistence import repositories as repo
from database.events_data import GAME_EVENTS, EVENTS_PER_CYCLE


# ── CRUD Template (mantenuti per retrocompatibilita') ──────────

def create_template(name: str, description: str, category: str,
                    target_sector: str = None, target_region: str = None,
                    intensity_level: str = "medium") -> dict:
    conn = get_db()
    try:
        template_id = repo.create_event_template(
            conn, name, description, category,
            target_sector, target_region, intensity_level
        )
        conn.commit()
        return repo.get_event_template(conn, template_id)
    finally:
        conn.close()


def update_template(template_id: int, **kwargs) -> dict:
    conn = get_db()
    try:
        repo.update_event_template(conn, template_id, **kwargs)
        conn.commit()
        return repo.get_event_template(conn, template_id)
    finally:
        conn.close()


def delete_template(template_id: int):
    conn = get_db()
    try:
        repo.delete_event_template(conn, template_id)
        conn.commit()
    finally:
        conn.close()


def list_templates(active_only: bool = False) -> list[dict]:
    conn = get_db()
    try:
        return repo.get_all_event_templates(conn, active_only)
    finally:
        conn.close()


# ── Generazione Eventi per Ciclo ────────────────────────────────

def generate_events_for_cycle(cycle_number: int) -> list[dict]:
    """
    Seleziona 3 eventi casuali dal pool di 19, senza ripetizioni.

    Per ogni evento:
    1. Salva nel database con 7-layer metadata
    2. Salva impatti ciclo 1 in event_impacts
    3. Crea pending_impacts con persistence PER-EVENTO
    4. Aggiorna variabili interne
    5. Marca evento come usato
    """
    conn = get_db()
    try:
        # 1. Recupera eventi gia' usati
        used_ids = repo.get_used_event_ids(conn)
        used_set = set(used_ids)

        # 2. Filtra pool disponibile
        available = [e for e in GAME_EVENTS if e["event_id"] not in used_set]

        if len(available) == 0:
            print(f"WARN: Nessun evento disponibile al ciclo {cycle_number}. Pool esaurito.")
            return []

        # 3. Seleziona fino a EVENTS_PER_CYCLE eventi
        num_to_select = min(EVENTS_PER_CYCLE, len(available))
        selected_events = random.sample(available, num_to_select)

        # Pre-carica mappa ticker -> security_id
        securities = repo.get_all_securities(conn)
        ticker_to_id = {s["ticker"]: s["id"] for s in securities}

        saved_events = []

        for game_event in selected_events:
            # Salva evento nel database con metadata completa
            is_catastrophic = game_event.get("cap_override", False)
            event_db_id = repo.create_event(
                conn,
                game_cycle=cycle_number,
                title=game_event["title"],
                body=game_event["body"],
                category=game_event["category"],
                template_id=None,
                tone=game_event.get("tone"),
                scope=game_event.get("scope"),
                origin_region=game_event.get("origin_region"),
                initial_intensity=game_event.get("initial_intensity"),
                duration_class=game_event.get("duration_class"),
                propagation=game_event.get("propagation"),
                decay_pattern=game_event.get("decay_pattern"),
                catastrophic=1 if is_catastrophic else 0,
            )

            # Salva impatti ciclo 1 per-titolo
            impacts_count = 0
            for ticker, pct in game_event["impacts"].items():
                if pct == 0.0:
                    continue
                security_id = ticker_to_id.get(ticker)
                if security_id is None:
                    continue
                repo.create_event_impact(
                    conn, event_id=event_db_id,
                    impact_type="delta_percent", impact_value=pct,
                    security_id=security_id
                )
                impacts_count += 1

            # Crea impatti pendenti con persistence PER-EVENTO
            persistence = game_event.get("persistence", {})
            persistence_filter = game_event.get("persistence_filter", {})

            for offset, factor in persistence.items():
                offset = int(offset)
                target_cycle = cycle_number + offset

                # Filtro ticker opzionale per questo offset
                allowed_tickers = persistence_filter.get(offset)

                for ticker, pct in game_event["impacts"].items():
                    if pct == 0.0:
                        continue
                    if allowed_tickers and ticker not in allowed_tickers:
                        continue
                    security_id = ticker_to_id.get(ticker)
                    if security_id is None:
                        continue
                    decayed_pct = round(pct * factor, 4)
                    if abs(decayed_pct) < 0.01:
                        continue
                    repo.create_pending_impact(
                        conn,
                        source_event_db_id=event_db_id,
                        target_cycle=target_cycle,
                        security_id=security_id,
                        impact_pct=decayed_pct
                    )

            # Cascade impacts: effetti domino amplificati nei cicli successivi
            cascade = game_event.get("cascade_impacts", {})
            for offset, ticker_impacts in cascade.items():
                offset = int(offset)
                target_cycle = cycle_number + offset
                for ticker, pct in ticker_impacts.items():
                    if abs(pct) < 0.01:
                        continue
                    security_id = ticker_to_id.get(ticker)
                    if security_id is None:
                        continue
                    repo.create_pending_impact(
                        conn,
                        source_event_db_id=event_db_id,
                        target_cycle=target_cycle,
                        security_id=security_id,
                        impact_pct=round(pct, 4)
                    )

            # Aggiorna variabili interne per tutti i titoli impattati
            variable_updates = game_event.get("variable_updates", {})
            if variable_updates:
                for ticker, pct in game_event["impacts"].items():
                    if pct == 0.0:
                        continue
                    security_id = ticker_to_id.get(ticker)
                    if security_id is None:
                        continue
                    # Scala il delta variabili in proporzione all'impatto sul titolo
                    # Piu' impatto = piu' cambio variabili
                    scale = abs(pct) / 10.0  # normalizzatore
                    scaled_updates = {}
                    for var_name, var_delta in variable_updates.items():
                        # Mantiene il segno del delta variabile ma scala con l'impatto
                        scaled = round(var_delta * scale, 2)
                        if abs(scaled) >= 0.01:
                            scaled_updates[var_name] = scaled
                    if scaled_updates:
                        repo.batch_update_internal_variables(conn, security_id, scaled_updates)

            # Marca evento come usato
            repo.mark_event_used(conn, game_event["event_id"], cycle_number)

            saved_events.append({
                "id": event_db_id,
                "title": game_event["title"],
                "body": game_event["body"],
                "category": game_event["category"],
                "tone": game_event.get("tone"),
                "impacts_count": impacts_count,
            })

        conn.commit()
        return saved_events
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_current_events(cycle_number: int) -> list[dict]:
    """Restituisce gli eventi del ciclo specificato."""
    conn = get_db()
    try:
        return repo.get_events_by_cycle(conn, cycle_number)
    finally:
        conn.close()
