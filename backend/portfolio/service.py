"""
Portfolio Service - Gestione portafogli, ordini e validazioni.
"""

from backend.persistence.database import get_db
from backend.persistence import repositories as repo


class InsufficientFundsError(Exception):
    pass


class InsufficientSharesError(Exception):
    pass


class InvalidGamePhaseError(Exception):
    pass


class PlayerNotFoundError(Exception):
    pass


class SecurityNotFoundError(Exception):
    pass


def get_portfolio(player_id: int) -> dict:
    """
    Restituisce il portafoglio completo di un giocatore:
    - dati giocatore
    - posizioni con avg_purchase_price e return_pct
    - storico valore portafoglio per ciclo (portfolio_history)
    - valore totale e performance
    """
    conn = get_db()
    try:
        player = repo.get_player(conn, player_id)
        if not player:
            raise PlayerNotFoundError(f"Player {player_id} not found")

        raw_positions = repo.get_portfolio(conn, player_id)
        all_trades = repo.get_player_trades(conn, player_id)
        portfolio_history = repo.get_portfolio_history(conn, player_id)

        # Raggruppa i trade per security_id
        trades_by_security: dict = {}
        for t in all_trades:
            sid = t["security_id"]
            trades_by_security.setdefault(sid, []).append(dict(t))

        positions = []
        total_securities_value = 0.0

        for pos in raw_positions:
            qty = pos["quantity"]
            price = pos["current_price"]
            pos_value = round(qty * price, 2)
            total_securities_value += pos_value

            # Calcola prezzo medio d'acquisto (solo BUY)
            sec_buys = [
                t for t in trades_by_security.get(pos["security_id"], [])
                if t["type"] == "BUY"
            ]
            total_cost = sum(t["quantity"] * t["price_at_execution"] for t in sec_buys)
            total_qty_bought = sum(t["quantity"] for t in sec_buys)
            avg_pp = round(total_cost / total_qty_bought, 2) if total_qty_bought > 0 else 0.0
            return_pct = round((price - avg_pp) / avg_pp * 100, 2) if avg_pp > 0 else 0.0

            positions.append({
                "security_id": pos["security_id"],
                "ticker": pos["ticker"],
                "security_name": pos["security_name"],
                "sector": pos.get("sector", ""),
                "quantity": qty,
                "current_price": price,
                "position_value": pos_value,
                "avg_purchase_price": avg_pp,
                "return_pct": return_pct,
                "beta": pos.get("beta", 1.0),
                "risk_level": pos.get("risk_level", 5.0),
            })

        total_value = player["current_cash"] + total_securities_value
        initial = player["initial_cash"] if player["initial_cash"] != 0 else 1
        performance = round(((total_value - player["initial_cash"]) / initial) * 100, 2)

        return {
            "player": dict(player),
            "positions": positions,
            "portfolio_history": [dict(h) for h in portfolio_history],
            "total_securities_value": round(total_securities_value, 2),
            "total_value": round(total_value, 2),
            "performance": performance,
        }
    finally:
        conn.close()


def compute_balance_metrics(player_id: int) -> dict:
    """
    Calcola le metriche di bilanciamento del portafoglio (solo informativo, non influenza classifica).

    Metriche:
    - diversification_score (0-100): HHI normalizzato su 12 settori. 0=tutto concentrato, 100=perfettamente equo
    - portfolio_beta: beta ponderato per peso posizione (sensibilità al mercato)
    - risk_score (1-10): risk_level ponderato per peso posizione
    - sharpe_ratio: rendimento/rischio da portfolio_history (None se < 3 punti)
    - cash_pct: % liquidità sul totale portafoglio
    - n_sectors: numero di settori distinti in portafoglio
    """
    data = get_portfolio(player_id)
    positions = data["positions"]
    total_value = data["total_value"]
    cash = data["player"]["current_cash"]
    invested = total_value - cash

    if invested <= 0 or not positions:
        return {
            "diversification_score": 0.0,
            "portfolio_beta": 0.0,
            "risk_score": 0.0,
            "sharpe_ratio": None,
            "cash_pct": 100.0,
            "n_sectors": 0,
        }

    # Pesi per ogni posizione rispetto al totale investito (solo securities)
    weights = [p["position_value"] / invested for p in positions]

    # 1. HHI Diversification Score (basato sui settori, non sui singoli titoli)
    N_SECTORS = 12  # numero settori del gioco
    sector_values: dict = {}
    for pos in positions:
        s = pos["sector"]
        sector_values[s] = sector_values.get(s, 0.0) + pos["position_value"]
    sector_weights = [v / invested for v in sector_values.values()]
    hhi = sum(w ** 2 for w in sector_weights)
    hhi_min = 1.0 / N_SECTORS  # HHI minimo con N settori perfettamente equi
    if hhi >= 1.0:
        diversification_score = 0.0
    else:
        diversification_score = round((1.0 - hhi) / (1.0 - hhi_min) * 100, 1)

    # 2. Portfolio Beta (media ponderata dei beta)
    portfolio_beta = round(sum(w * p["beta"] for w, p in zip(weights, positions)), 2)

    # 3. Weighted Risk Score (1-10)
    risk_score = round(sum(w * p["risk_level"] for w, p in zip(weights, positions)), 1)

    # 4. Sharpe Ratio — dalla portfolio_history (almeno 3 punti ciclo)
    conn = get_db()
    try:
        history = repo.get_portfolio_history(conn, player_id)
    finally:
        conn.close()

    sharpe = None
    if len(history) >= 3:
        vals = [h["total_value"] for h in history]
        returns = [(vals[i] - vals[i - 1]) / vals[i - 1] for i in range(1, len(vals)) if vals[i - 1] > 0]
        if len(returns) >= 2:
            mean_r = sum(returns) / len(returns)
            variance = sum((r - mean_r) ** 2 for r in returns) / len(returns)
            std_r = variance ** 0.5
            sharpe = round(mean_r / std_r, 2) if std_r > 0 else None

    return {
        "diversification_score": diversification_score,
        "portfolio_beta": portfolio_beta,
        "risk_score": risk_score,
        "sharpe_ratio": sharpe,
        "cash_pct": round(cash / total_value * 100, 1) if total_value > 0 else 100.0,
        "n_sectors": len(sector_values),
    }


def get_portfolio_value(player_id: int) -> float:
    data = get_portfolio(player_id)
    return data["total_value"]


def execute_trade(player_id: int, security_id: int, trade_type: str, quantity: int) -> dict:
    conn = get_db()
    try:
        game = repo.get_game_state(conn)
        if not game or game["status"] != "decision":
            raise InvalidGamePhaseError(
                f"Trading not allowed in phase: {game['status'] if game else 'no game'}"
            )

        player = repo.get_player(conn, player_id)
        if not player:
            raise PlayerNotFoundError(f"Player {player_id} not found")
        if not player["active"]:
            raise PlayerNotFoundError(f"Player {player_id} is not active")

        security = repo.get_security(conn, security_id)
        if not security:
            raise SecurityNotFoundError(f"Security {security_id} not found")

        price = security["current_price"]
        total_cost = price * quantity
        cycle = game["current_cycle"]
        new_cash = player["current_cash"]

        if trade_type == "BUY":
            if total_cost > player["current_cash"]:
                raise InsufficientFundsError(
                    f"Insufficient funds: need {total_cost:.2f}, have {player['current_cash']:.2f}"
                )
            new_cash = player["current_cash"] - total_cost
            repo.update_player_cash(conn, player_id, new_cash)
            position = repo.get_portfolio_position(conn, player_id, security_id)
            current_qty = position["quantity"] if position else 0
            repo.upsert_portfolio_position(conn, player_id, security_id, current_qty + quantity)

        elif trade_type == "SELL":
            position = repo.get_portfolio_position(conn, player_id, security_id)
            current_qty = position["quantity"] if position else 0
            if quantity > current_qty:
                raise InsufficientSharesError(
                    f"Insufficient shares: want to sell {quantity}, own {current_qty}"
                )
            new_cash = player["current_cash"] + total_cost
            repo.update_player_cash(conn, player_id, new_cash)
            repo.upsert_portfolio_position(conn, player_id, security_id, current_qty - quantity)

        else:
            raise ValueError(f"Invalid trade type: {trade_type}")

        trade_id = repo.create_trade(
            conn, player_id, security_id, cycle, trade_type, quantity, price
        )
        conn.commit()

        return {
            "trade_id": trade_id,
            "player_id": player_id,
            "security_id": security_id,
            "type": trade_type,
            "quantity": quantity,
            "price": price,
            "total": round(total_cost, 2),
            "new_cash": round(new_cash, 2),
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_trades(player_id: int) -> list[dict]:
    conn = get_db()
    try:
        return repo.get_player_trades(conn, player_id)
    finally:
        conn.close()
