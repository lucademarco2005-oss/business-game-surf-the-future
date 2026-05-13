"""
Impact Service - Applicazione impatti eventi ai prezzi, fondamentali e portafogli.

Pipeline di impatto per ciclo:
1. Legge il drift baseline (gia calcolato da drift/service.py)
2. Legge gli impatti del ciclo corrente (da event_impacts)
3. Legge gli impatti pendenti (decay da cicli precedenti)
4. Per ogni titolo:
   a. Ordina gli eventi per |impatto| decrescente
   b. Applica single-event cap per cap_class
   c. Applica multi-event scaling (100/70/50/30%)
   d. Applica anti-catastrofe / anti-euforia
   e. Somma il drift baseline
5. Aggiorna prezzi e fondamentali
6. Salva storico prezzi
7. Marca impatti pendenti come applicati
8. Ricalcola e salva il valore dei portafogli
"""

from backend.persistence.database import get_db
from backend.persistence import repositories as repo
from database.events_data import (
    FUNDAMENTAL_RATIOS,
    SINGLE_EVENT_CAPS,
    MULTI_EVENT_SCALE,
    ANTI_CATASTROPHE_THRESHOLD,
    ANTI_CATASTROPHE_REDUCE_PCT,
    ANTI_EUPHORIA_THRESHOLD,
    ANTI_EUPHORIA_COMPRESS_PCT,
    BETA_DAMPENING,
    BETA_IMPACT_WEIGHT,
    CATASTROPHIC_CAP_OVERRIDES,
    CATASTROPHIC_ANTI_REDUCE_PCT,
)
from database.baseline_data import STOCK_PROFILES


def apply_impacts(cycle_number: int):
    """
    Applica tutti gli impatti del ciclo ai prezzi e fondamentali dei titoli,
    integra il drift baseline e ricalcola i portafogli.
    """
    conn = get_db()
    try:
        securities = repo.get_all_securities(conn)

        # 0. Salva il prezzo corrente come open_price (prezzo pre-ciclo)
        #    Serve al frontend per colorare correttamente i delta ultimo ciclo
        for sec in securities:
            repo.update_security_fundamentals(conn, sec["id"],
                                              open_price=sec["current_price"])

        # 1. Drift baseline (calcolato e salvato in apply_baseline_drift)
        drifts = repo.get_baseline_drifts_for_cycle(conn, cycle_number)

        # 2. Impatti del ciclo corrente (100% forza)
        current_impacts = repo.get_impacts_by_cycle(conn, cycle_number)

        # 3. Impatti pendenti (decay da cicli precedenti)
        pending_impacts = repo.get_pending_impacts_for_cycle(conn, cycle_number)

        # Organizza impatti per security_id come lista di (delta%, is_catastrophic)
        impact_lists = {s["id"]: [] for s in securities}
        # Track se almeno un evento catastrofico e' presente nel ciclo
        has_catastrophic = False

        for impact in current_impacts:
            sid = impact.get("security_id")
            if not sid:
                continue
            is_cat = impact.get("catastrophic", 0) == 1
            if is_cat:
                has_catastrophic = True
            value = impact["impact_value"]
            if impact["impact_type"] == "delta_percent":
                impact_lists[sid].append((value, is_cat))
            elif impact["impact_type"] == "multiplier":
                delta = (value - 1.0) * 100.0
                impact_lists[sid].append((delta, is_cat))

        for pending in pending_impacts:
            sid = pending["security_id"]
            pct = pending["impact_pct"]
            is_cat = pending.get("catastrophic", 0) == 1
            if is_cat:
                has_catastrophic = True
            impact_lists[sid].append((pct, is_cat))

        # 4. Per ogni titolo, applica la pipeline di calibrazione
        pct_changes = {}
        for security in securities:
            sid = security["id"]
            ticker = security["ticker"]

            events_with_flags = impact_lists.get(sid, [])
            drift = drifts.get(sid, 0.0)

            profile = STOCK_PROFILES.get(ticker, {"cap_class": "large_cap"})
            cap_class = profile.get("cap_class", "large_cap")
            cap_normal = SINGLE_EVENT_CAPS.get(cap_class, 12.0)
            cap_catastrophic = CATASTROPHIC_CAP_OVERRIDES.get(cap_class, 18.0)

            if not events_with_flags:
                # Solo drift baseline, nessun evento
                pct_changes[sid] = drift
                continue

            # a. Ordina per |impatto| decrescente
            events_with_flags.sort(key=lambda x: abs(x[0]), reverse=True)

            # b+c. Single-event cap + multi-event scaling
            scaled = []
            for i, (ev_pct, is_cat) in enumerate(events_with_flags):
                # Usa cap piu' alto per impatti da eventi catastrofici
                cap_limit = cap_catastrophic if is_cat else cap_normal
                # Single-event cap: limita il singolo impatto
                capped = max(-cap_limit, min(cap_limit, ev_pct))
                # Multi-event scaling: riduce gli eventi meno impattanti
                scale = MULTI_EVENT_SCALE[i] if i < len(MULTI_EVENT_SCALE) else MULTI_EVENT_SCALE[-1]
                scaled.append(capped * scale)

            # Separa positivi e negativi per regole anti-
            positives = [s for s in scaled if s > 0]
            negatives = [s for s in scaled if s < 0]

            total_pos = sum(positives)
            total_neg = sum(negatives)

            # d. Anti-catastrofe: se troppi eventi negativi, comprimi
            #    Compressione ridotta se almeno un evento catastrofico nel ciclo
            if len(negatives) >= ANTI_CATASTROPHE_THRESHOLD:
                reduce_pct = CATASTROPHIC_ANTI_REDUCE_PCT if has_catastrophic else ANTI_CATASTROPHE_REDUCE_PCT
                total_neg *= (1.0 - reduce_pct)

            # Anti-euforia: se troppi eventi positivi, comprimi
            if len(positives) >= ANTI_EUPHORIA_THRESHOLD:
                total_pos *= (1.0 - ANTI_EUPHORIA_COMPRESS_PCT)

            event_total = total_pos + total_neg

            # e. Modulazione beta: amplifica/smorza in base alla reattivita del titolo
            beta = security.get("beta", 1.0) or 1.0
            beta_factor = BETA_DAMPENING + BETA_IMPACT_WEIGHT * beta
            event_total *= beta_factor

            # f. Somma il drift baseline
            pct_changes[sid] = event_total + drift

        # 5-6. Aggiorna prezzi, fondamentali e salva storico
        for security in securities:
            sid = security["id"]
            total_pct = pct_changes.get(sid, 0.0)

            if abs(total_pct) < 0.001:
                # Nessuna variazione significativa, salva solo storico
                repo.save_price_history(conn, sid, cycle_number, security["current_price"])
                continue

            # Calcola nuovo prezzo
            old_price = security["current_price"]
            multiplier = 1.0 + (total_pct / 100.0)
            new_price = round(old_price * multiplier, 2)
            new_price = max(new_price, 0.01)  # Floor minimo

            # Aggiorna prezzo
            repo.update_security_price(conn, sid, new_price)

            # Aggiorna fondamentali in proporzione
            _update_fundamentals(conn, security, total_pct, new_price)

            # Salva storico prezzo
            repo.save_price_history(conn, sid, cycle_number, new_price)

        # 7. Marca impatti pendenti come applicati
        repo.mark_pending_impacts_applied(conn, cycle_number)

        # 8. Ricalcola e salva il valore dei portafogli
        _save_portfolio_snapshots(conn, cycle_number)

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _update_fundamentals(conn, security: dict, price_pct: float, new_price: float):
    """
    Aggiorna i fondamentali di un titolo in proporzione alla variazione di prezzo.
    Ogni fondamentale cambia di price_pct * ratio (definito in FUNDAMENTAL_RATIOS).
    PE ratio viene ricalcolato come price / eps.
    """
    sid = security["id"]
    updates = {}

    for fundamental, ratio in FUNDAMENTAL_RATIOS.items():
        current_value = security.get(fundamental, 0)
        if current_value is None or current_value == 0:
            continue

        # Calcola la variazione proporzionale
        fund_pct = price_pct * ratio
        fund_multiplier = 1.0 + (fund_pct / 100.0)
        new_value = round(current_value * fund_multiplier, 2)

        # Protezioni
        if fundamental in ("revenue", "ebitda", "market_cap"):
            new_value = max(new_value, 0)  # Non possono essere negativi
        if fundamental == "target_price":
            new_value = max(new_value, 0.01)

        updates[fundamental] = new_value

    # Ricalcola PE ratio da price / eps (se eps != 0)
    new_eps = updates.get("eps", security.get("eps", 0))
    if new_eps and abs(new_eps) > 0.001:
        updates["pe_ratio"] = round(new_price / new_eps, 2)

    # Aggiorna close/bid/ask (open_price e' gia' impostato a inizio ciclo)
    updates["close_price"] = new_price
    updates["bid"] = round(new_price * 0.999, 2)
    updates["ask"] = round(new_price * 1.001, 2)

    if updates:
        repo.update_security_fundamentals(conn, sid, **updates)


def save_cycle_snapshot(cycle_number: int):
    """
    Salva uno snapshot dei prezzi e dei portafogli per un ciclo.
    Usato per snapshot aggiuntivi (es. chiusura fase decisionale).
    """
    conn = get_db()
    try:
        _save_portfolio_snapshots(conn, cycle_number)
        conn.commit()
    finally:
        conn.close()


def _save_portfolio_snapshots(conn, cycle_number: int):
    """
    Calcola e salva il valore totale del portafoglio per ogni giocatore attivo.
    Valore = cash + somma(quantita' * prezzo_corrente) per ogni posizione.
    """
    players = repo.get_all_players(conn)
    for player in players:
        if not player["active"]:
            continue

        positions = repo.get_portfolio(conn, player["id"])
        total_securities = sum(
            pos["quantity"] * pos["current_price"] for pos in positions
        )
        total_value = player["current_cash"] + total_securities

        repo.save_portfolio_history(conn, player["id"], cycle_number, round(total_value, 2))
