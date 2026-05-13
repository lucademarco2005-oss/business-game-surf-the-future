"""
Volpe d'Oro Service — Calcolo del premio per la migliore lettura degli eventi.

Misura quanto bene ogni squadra ha letto gli eventi e modificato il portafoglio
in risposta. NON correla direttamente con il profitto totale.

5 componenti (0-100):
  C1. Allineamento direzione trade (0-35)
  C2. Ottimizzazione esposizione (0-25)
  C3. Lettura settoriale (0-15)
  C4. Evitamento rischi (0-15)
  C5. Bonus consistenza (0-10)

Timing: le trade del ciclo N vengono valutate contro i prezzi del ciclo N+1.
"""

import math
import sqlite3
from typing import Optional

from backend.persistence import repositories as repo


# ── HELPERS ───────────────────────────────────────────────────

def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _price_changes(prices_now: dict, prices_next: dict) -> dict:
    """Ritorna {security_id: pct_change} tra due cicli."""
    changes = {}
    for sid, p0 in prices_now.items():
        p1 = prices_next.get(sid)
        if p1 is not None and p0 > 0:
            changes[sid] = (p1 - p0) / p0 * 100.0
    return changes


# ── C1: TRADE DIRECTION ALIGNMENT (0-35) ─────────────────────

def _trade_direction_alignment(trades: list, price_changes: dict) -> float:
    """
    Per ogni trade, confronta direzione con il movimento reale.
    BUY + sale = buono, SELL + scende = buono.
    Pesato per valore della trade.
    """
    if not trades:
        return 0.0

    weighted_alignment = 0.0
    total_value = 0.0

    for t in trades:
        sid = t["security_id"]
        move = price_changes.get(sid, 0.0)
        trade_value = t["quantity"] * t["price_at_execution"]
        total_value += trade_value

        # Magnitudine scalata: cap a 5% per evitare che un singolo
        # grande movimento domini il punteggio
        magnitude = min(abs(move) / 5.0, 1.0)

        if t["type"] == "BUY" and move > 0:
            alignment = +magnitude
        elif t["type"] == "SELL" and move < 0:
            alignment = +magnitude
        elif t["type"] == "BUY" and move < 0:
            alignment = -magnitude
        elif t["type"] == "SELL" and move > 0:
            alignment = -magnitude
        else:
            alignment = 0.0

        weighted_alignment += alignment * trade_value

    if total_value <= 0:
        return 0.0

    raw = weighted_alignment / total_value  # [-1, +1]
    return max(0.0, (raw + 1.0) / 2.0) * 35.0


# ── C2: EXPOSURE OPTIMIZATION (0-25) ─────────────────────────

def _exposure_optimization(positions: list, price_changes: dict,
                           prices_now: dict) -> float:
    """
    Misura quanto il portafoglio e' posizionato verso titoli in salita.
    Sottrae la media di mercato per isolare l'abilita'.
    """
    if not positions or not price_changes:
        return 12.5  # neutro

    weighted_move = 0.0
    total_invested = 0.0

    for pos in positions:
        sid = pos["security_id"]
        price = prices_now.get(sid, 0)
        if price <= 0:
            continue
        pos_value = pos["quantity"] * price
        move = price_changes.get(sid, 0.0)
        weighted_move += move * pos_value
        total_invested += pos_value

    if total_invested <= 0:
        return 12.5

    portfolio_alignment = weighted_move / total_invested

    # Media di mercato (tutti i titoli, non pesata)
    all_moves = [v for v in price_changes.values()]
    avg_market = sum(all_moves) / len(all_moves) if all_moves else 0.0

    excess = portfolio_alignment - avg_market
    raw = _clamp(excess / 5.0, -1.0, 1.0)
    return max(0.0, (raw + 1.0) / 2.0) * 25.0


# ── C3: SECTOR READING (0-15) ────────────────────────────────

def _sector_reading(trades: list, price_changes: dict,
                    securities: list) -> float:
    """
    Misura se il flusso netto per settore (buy-sell) e' allineato
    con il movimento settoriale nel ciclo successivo.
    """
    if not trades:
        return 7.5  # neutro

    # Mappa security_id -> sector
    sid_to_sector = {s["id"]: s["sector"] for s in securities}

    # Calcola flusso netto per settore
    sector_flows = {}
    for t in trades:
        sector = t.get("sector") or sid_to_sector.get(t["security_id"], "")
        if not sector:
            continue
        value = t["quantity"] * t["price_at_execution"]
        if t["type"] == "BUY":
            sector_flows[sector] = sector_flows.get(sector, 0.0) + value
        else:
            sector_flows[sector] = sector_flows.get(sector, 0.0) - value

    # Calcola media movimento per settore
    sector_moves = {}
    sector_counts = {}
    for s in securities:
        sector = s["sector"]
        move = price_changes.get(s["id"], 0.0)
        sector_moves[sector] = sector_moves.get(sector, 0.0) + move
        sector_counts[sector] = sector_counts.get(sector, 0) + 1

    for sector in sector_moves:
        if sector_counts[sector] > 0:
            sector_moves[sector] /= sector_counts[sector]

    # Calcola allineamento
    weighted_score = 0.0
    total_flow = 0.0

    for sector, flow in sector_flows.items():
        avg_move = sector_moves.get(sector, 0.0)
        abs_flow = abs(flow)
        total_flow += abs_flow

        if flow > 0 and avg_move > 0:
            weighted_score += abs_flow
        elif flow < 0 and avg_move < 0:
            weighted_score += abs_flow
        elif flow > 0 and avg_move < 0:
            weighted_score -= abs_flow
        elif flow < 0 and avg_move > 0:
            weighted_score -= abs_flow

    if total_flow <= 0:
        return 7.5

    raw = weighted_score / total_flow  # [-1, +1]
    return max(0.0, (raw + 1.0) / 2.0) * 15.0


# ── C4: NEGATIVE AVOIDANCE (0-15) ────────────────────────────

def _negative_avoidance(positions_before: dict, positions_after: dict,
                        price_changes: dict) -> float:
    """
    Misura se il giocatore ha ridotto esposizione ai titoli che stanno
    per crollare (top 15 peggiori performer).
    positions_before/after: {security_id: quantity}
    """
    # Identifica i 15 peggiori performer (almeno -1%)
    negative_movers = [(sid, pct) for sid, pct in price_changes.items() if pct < -1.0]
    negative_movers.sort(key=lambda x: x[1])
    danger_stocks = negative_movers[:15]

    if not danger_stocks:
        return 7.5  # neutro, nessun titolo in pericolo

    avoidance_score = 0.0
    count = 0

    for sid, move_pct in danger_stocks:
        qty_before = positions_before.get(sid, 0)
        qty_after = positions_after.get(sid, 0)
        move_factor = min(abs(move_pct) / 5.0, 1.0)
        count += 1

        if qty_before > 0 and qty_after < qty_before:
            # Ridotto esposizione: bene
            reduction = (qty_before - qty_after) / qty_before
            avoidance_score += reduction * move_factor
        elif qty_before == 0 and qty_after == 0:
            # Mai posseduto: leggero positivo
            avoidance_score += 0.3
        elif qty_after > qty_before:
            # Aumentato esposizione a danger stock: male
            avoidance_score -= move_factor
        # else: tenuto senza cambiare → 0

    if count <= 0:
        return 7.5

    raw = _clamp(avoidance_score / count, -1.0, 1.0)
    return max(0.0, (raw + 1.0) / 2.0) * 15.0


# ── C5: CONSISTENCY BONUS (0-10) ─────────────────────────────

def _consistency_bonus(player_cycle_totals: list, all_players_cycle_scores: dict) -> float:
    """
    Premia giocatori costantemente sopra la mediana.
    player_cycle_totals: [score_cycle_1, score_cycle_2, ...]
    all_players_cycle_scores: {cycle: [scores_all_players]}
    """
    if len(player_cycle_totals) < 2:
        return 5.0  # neutro per pochi dati

    mean_score = sum(player_cycle_totals) / len(player_cycle_totals)
    variance = sum((s - mean_score) ** 2 for s in player_cycle_totals) / len(player_cycle_totals)
    std_score = math.sqrt(variance)

    # Coefficiente di variazione (basso = costante)
    cv = std_score / mean_score if mean_score > 0 else 2.0
    cv_factor = 1.0 - min(cv, 1.0)

    # Percentuale cicli sopra mediana di tutti i giocatori
    above_median_count = 0
    total_cycles = 0

    for i, score in enumerate(player_cycle_totals):
        cycle_idx = i  # indice nel vettore
        # Cerca la mediana di quel ciclo
        cycle_all = all_players_cycle_scores.get(cycle_idx, [])
        if cycle_all:
            sorted_scores = sorted(cycle_all)
            median = sorted_scores[len(sorted_scores) // 2]
            if score >= median:
                above_median_count += 1
            total_cycles += 1

    above_pct = above_median_count / total_cycles if total_cycles > 0 else 0.5

    consistency = cv_factor * 0.5 + above_pct * 0.5
    return consistency * 10.0


# ── MAIN FUNCTIONS ────────────────────────────────────────────

def compute_cycle_score(player_id: int, cycle_number: int, conn: sqlite3.Connection):
    """
    Calcola e salva il punteggio Volpe d'Oro (C1-C4) per un giocatore
    nel ciclo specificato.

    Le trade del ciclo N vengono valutate contro i prezzi del ciclo N+1.
    Questa funzione va chiamata DOPO che i prezzi del ciclo N+1 sono stati applicati.
    """
    # Prezzi al ciclo N e N+1
    prices_now = repo.get_all_prices_at_cycle(conn, cycle_number)
    prices_next = repo.get_all_prices_at_cycle(conn, cycle_number + 1)

    if not prices_now or not prices_next:
        return  # dati insufficienti

    changes = _price_changes(prices_now, prices_next)
    if not changes:
        return

    # Trade del giocatore nel ciclo N
    trades = repo.get_trades_by_player_cycle(conn, player_id, cycle_number)

    # Posizioni correnti (post-trade) — per C2
    positions = repo.get_portfolio_positions(conn, player_id)

    # Tutti i titoli per la mappa settoriale
    securities = repo.get_all_securities(conn)

    # Ricostruisci posizioni PRIMA delle trade del ciclo N
    # (posizione attuale - buy + sell del ciclo)
    positions_after = {p["security_id"]: p["quantity"] for p in positions}
    positions_before = dict(positions_after)
    for t in trades:
        sid = t["security_id"]
        if t["type"] == "BUY":
            positions_before[sid] = positions_before.get(sid, 0) - t["quantity"]
        else:
            positions_before[sid] = positions_before.get(sid, 0) + t["quantity"]
    # Rimuovi quantita' negative (artefatti)
    positions_before = {k: max(0, v) for k, v in positions_before.items()}

    # Calcola i 4 componenti
    c1 = _trade_direction_alignment(trades, changes)
    c2 = _exposure_optimization(positions, changes, prices_now)
    c3 = _sector_reading(trades, changes, securities)
    c4 = _negative_avoidance(positions_before, positions_after, changes)

    raw_total = round(c1 + c2 + c3 + c4, 2)

    repo.save_volpe_doro_score(conn, player_id, cycle_number,
                                c1, c2, c3, c4, raw_total)


def compute_final_volpe_doro(conn: sqlite3.Connection):
    """
    Calcola il bonus consistenza (C5) e la classifica finale.
    Va chiamata quando il gioco finisce.
    """
    players = repo.get_all_players(conn)
    active_players = [p for p in players if p["active"]]

    # Raccogli tutti i punteggi ciclo per ogni giocatore
    all_scores = {}
    for p in active_players:
        scores = repo.get_volpe_doro_scores_by_player(conn, p["id"])
        all_scores[p["id"]] = [s["raw_total"] for s in scores]

    # Organizza per ciclo (per calcolare la mediana per ciclo)
    max_cycles = max((len(v) for v in all_scores.values()), default=0)
    cycle_scores = {}  # {cycle_idx: [scores]}
    for cycle_idx in range(max_cycles):
        cycle_scores[cycle_idx] = []
        for pid, scores in all_scores.items():
            if cycle_idx < len(scores):
                cycle_scores[cycle_idx].append(scores[cycle_idx])

    # Per ogni giocatore, calcola C5 e aggiorna i punteggi
    for p in active_players:
        player_totals = all_scores.get(p["id"], [])
        if not player_totals:
            continue

        c5 = _consistency_bonus(player_totals, cycle_scores)

        # Ricalcola il raw_total finale includendo C5
        # C5 viene distribuito equamente su tutti i cicli del giocatore
        c5_per_cycle = c5 / len(player_totals) if player_totals else 0

        scores = repo.get_volpe_doro_scores_by_player(conn, p["id"])
        for s in scores:
            new_total = round(s["raw_total"] + c5_per_cycle, 2)
            repo.save_volpe_doro_score(
                conn, p["id"], s["cycle_number"],
                s["component_1"], s["component_2"],
                s["component_3"], s["component_4"],
                new_total
            )


def get_volpe_doro_leaderboard(conn: sqlite3.Connection) -> list:
    """Ritorna la classifica Volpe d'Oro con rank."""
    results = repo.get_all_volpe_doro_final(conn)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results


# ── NARRATIVE "BEST MOVES" ───────────────────────────────────

COMPONENT_LABELS = {
    "C1": "Direzione Trade",
    "C2": "Esposizione",
    "C3": "Lettura Settori",
    "C4": "Evitamento Rischi",
}


def _pct_to_arrow(pct: float) -> str:
    if pct >= 5:
        return "↑↑↑"
    if pct >= 2:
        return "↑↑"
    if pct > 0:
        return "↑"
    if pct <= -5:
        return "↓↓↓"
    if pct <= -2:
        return "↓↓"
    return "↓"


def _build_motivations(cycle_scores: list, winner_id: int,
                       conn: sqlite3.Connection) -> list:
    """
    Genera motivazioni SPECIFICHE basate sulle azioni reali del vincitore.
    Cerca le trade concrete, i titoli e gli eventi che hanno generato il punteggio.
    """
    motivations = []

    # Raccogli tutte le trade corrette del vincitore con contesto
    all_correct_buys = []   # BUY su titoli saliti
    all_correct_sells = []  # SELL su titoli scesi
    sector_flows = {}       # {cycle: {sector: net_flow}}

    for cs in cycle_scores:
        cycle = cs["cycle_number"]
        trades = repo.get_trades_by_player_cycle(conn, winner_id, cycle)
        if not trades:
            continue

        prices_now = repo.get_all_prices_at_cycle(conn, cycle)
        prices_next = repo.get_all_prices_at_cycle(conn, cycle + 1)
        if not prices_now or not prices_next:
            continue

        changes = _price_changes(prices_now, prices_next)
        events = repo.get_events_by_cycle(conn, cycle)
        event_title = events[0]["title"] if events else None

        cycle_sector_flows = {}
        for t in trades:
            sid = t["security_id"]
            pct = changes.get(sid, 0.0)
            ticker = t.get("ticker", "???")
            sector = t.get("sector", "")
            trade_value = t["quantity"] * t["price_at_execution"]

            # Track sector flows
            if sector:
                if t["type"] == "BUY":
                    cycle_sector_flows[sector] = cycle_sector_flows.get(sector, 0) + trade_value
                else:
                    cycle_sector_flows[sector] = cycle_sector_flows.get(sector, 0) - trade_value

            if t["type"] == "BUY" and pct > 0:
                all_correct_buys.append({
                    "ticker": ticker, "pct": pct, "cycle": cycle,
                    "event_title": event_title, "value": trade_value,
                    "quantity": t["quantity"],
                })
            elif t["type"] == "SELL" and pct < 0:
                all_correct_sells.append({
                    "ticker": ticker, "pct": pct, "cycle": cycle,
                    "event_title": event_title, "value": trade_value,
                    "quantity": t["quantity"],
                })

        sector_flows[cycle] = cycle_sector_flows

    # --- MOTIVAZIONE 1: Miglior acquisto ---
    all_correct_buys.sort(key=lambda x: x["pct"] * x["value"], reverse=True)
    if all_correct_buys:
        best = all_correct_buys[0]
        desc = "Ha comprato {} al ciclo {}".format(best["ticker"], best["cycle"])
        if best["event_title"]:
            desc += ", leggendo correttamente l'evento"
        desc += ". Il titolo e' poi salito del {:.1f}%".format(best["pct"])
        motivations.append({
            "icon": "🎯",
            "label": "Miglior Acquisto",
            "description": desc,
            "ticker": best["ticker"],
            "arrow": _pct_to_arrow(best["pct"]),
            "pct": round(best["pct"], 1),
            "cycle": best["cycle"],
            "event_title": best["event_title"],
        })

    # --- MOTIVAZIONE 2: Miglior vendita ---
    all_correct_sells.sort(key=lambda x: abs(x["pct"]) * x["value"], reverse=True)
    if all_correct_sells:
        best = all_correct_sells[0]
        desc = "Ha venduto {} al ciclo {} prima del crollo".format(best["ticker"], best["cycle"])
        desc += ". Il titolo e' poi sceso del {:.1f}%".format(abs(best["pct"]))
        motivations.append({
            "icon": "🛡️",
            "label": "Miglior Vendita",
            "description": desc,
            "ticker": best["ticker"],
            "arrow": _pct_to_arrow(best["pct"]),
            "pct": round(best["pct"], 1),
            "cycle": best["cycle"],
            "event_title": best["event_title"],
        })

    # --- MOTIVAZIONE 3: Secondo miglior acquisto (diverso dal primo) ---
    for buy in all_correct_buys[1:]:
        if not motivations or buy["ticker"] != all_correct_buys[0]["ticker"]:
            desc = "Ha puntato su {} al ciclo {}".format(buy["ticker"], buy["cycle"])
            desc += " — e' salito del {:.1f}%".format(buy["pct"])
            motivations.append({
                "icon": "📊",
                "label": "Altra Mossa Vincente",
                "description": desc,
                "ticker": buy["ticker"],
                "arrow": _pct_to_arrow(buy["pct"]),
                "pct": round(buy["pct"], 1),
                "cycle": buy["cycle"],
                "event_title": buy["event_title"],
            })
            break

    # --- MOTIVAZIONE 4: Secondo miglior sell (diverso dal primo) ---
    for sell in all_correct_sells[1:]:
        already_tickers = [m.get("ticker") for m in motivations]
        if sell["ticker"] not in already_tickers:
            desc = "Si e' liberata di {} al ciclo {}".format(sell["ticker"], sell["cycle"])
            desc += " — poi e' sceso del {:.1f}%".format(abs(sell["pct"]))
            motivations.append({
                "icon": "🔻",
                "label": "Rischio Evitato",
                "description": desc,
                "ticker": sell["ticker"],
                "arrow": _pct_to_arrow(sell["pct"]),
                "pct": round(sell["pct"], 1),
                "cycle": sell["cycle"],
                "event_title": sell["event_title"],
            })
            break

    # Se non ci sono abbastanza trade, fallback su componenti generiche
    if len(motivations) < 2:
        avg_c1 = sum(s["component_1"] for s in cycle_scores) / len(cycle_scores)
        avg_c2 = sum(s["component_2"] for s in cycle_scores) / len(cycle_scores)
        fallbacks = [
            {"icon": "🎯", "label": "Direzione Trade",
             "description": "Ha scelto la direzione giusta: comprare prima dei rialzi e vendere prima dei ribassi",
             "ticker": None, "arrow": None, "pct": None, "cycle": None, "event_title": None},
            {"icon": "📊", "label": "Posizionamento",
             "description": "Ha mantenuto il portafoglio posizionato sui titoli giusti al momento giusto",
             "ticker": None, "arrow": None, "pct": None, "cycle": None, "event_title": None},
        ]
        for fb in fallbacks:
            if len(motivations) >= 2:
                break
            if not any(m["label"] == fb["label"] for m in motivations):
                motivations.append(fb)

    return motivations[:4]


def get_volpe_doro_winner_narrative(conn: sqlite3.Connection) -> Optional[dict]:
    """
    Genera i dati narrativi per il vincitore della Volpe d'Oro:
    nome, score, motivazioni (sempre presenti) e trade migliori (se ci sono).
    """
    leaderboard = repo.get_all_volpe_doro_final(conn)
    if not leaderboard:
        return None

    winner = leaderboard[0]  # primo per avg_total
    winner_id = winner["player_id"]

    # Score per-ciclo del vincitore
    cycle_scores = repo.get_volpe_doro_scores_by_player(conn, winner_id)
    if not cycle_scores:
        return None

    # Motivazioni (sempre presenti, basate sui punteggi)
    motivations = _build_motivations(cycle_scores, winner_id, conn)

    # Raccogli TUTTE le trade del vincitore su tutti i cicli
    all_scored_trades = []

    for cs in cycle_scores:
        cycle = cs["cycle_number"]

        events = repo.get_events_by_cycle(conn, cycle)
        event_title = events[0]["title"] if events else "Ciclo di mercato"

        trades = repo.get_trades_by_player_cycle(conn, winner_id, cycle)
        if not trades:
            continue

        prices_now = repo.get_all_prices_at_cycle(conn, cycle)
        prices_next = repo.get_all_prices_at_cycle(conn, cycle + 1)
        if not prices_now or not prices_next:
            continue

        changes = _price_changes(prices_now, prices_next)

        for t in trades:
            sid = t["security_id"]
            pct = changes.get(sid, 0.0)
            correct = (t["type"] == "BUY" and pct > 0) or (t["type"] == "SELL" and pct < 0)
            if not correct:
                continue

            trade_value = t["quantity"] * t["price_at_execution"]
            move_score = abs(pct) * trade_value

            all_scored_trades.append({
                "ticker": t.get("ticker", "???"),
                "security_name": t.get("security_name", ""),
                "action": t["type"],
                "quantity": t["quantity"],
                "price": round(t["price_at_execution"], 2),
                "result_arrow": _pct_to_arrow(pct),
                "price_change_pct": round(pct, 1),
                "cycle": cycle,
                "event_title": event_title,
                "move_score": move_score,
            })

    # Top 5 trade per move_score
    all_scored_trades.sort(key=lambda x: x["move_score"], reverse=True)
    best_trades = all_scored_trades[:5]

    for t in best_trades:
        del t["move_score"]

    return {
        "name": winner["name"],
        "score": round(winner["avg_total"], 1),
        "motivations": motivations,
        "best_trades": best_trades,
    }
