"""
API Routes - Player endpoints.

Endpoint per la gestione del portafoglio del singolo giocatore:
- Lettura portafoglio
- Esecuzione ordini
- Storico operazioni
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.portfolio.service import (
    get_portfolio,
    execute_trade,
    get_trades,
    compute_balance_metrics,
    InsufficientFundsError,
    InsufficientSharesError,
    InvalidGamePhaseError,
    PlayerNotFoundError,
    SecurityNotFoundError,
)

router = APIRouter(prefix="/api/player", tags=["player"])


class TradeRequest(BaseModel):
    security_id: int
    type: str  # 'BUY' or 'SELL'
    quantity: int


@router.get("/{player_id}")
def api_get_player(player_id: int):
    """Restituisce i dati del giocatore, portafoglio completo e metriche di bilanciamento."""
    try:
        data = get_portfolio(player_id)
        data["balance"] = compute_balance_metrics(player_id)
        return data
    except PlayerNotFoundError:
        raise HTTPException(status_code=404, detail="Player not found")


@router.get("/{player_id}/trades")
def api_get_trades(player_id: int):
    """Restituisce lo storico delle operazioni del giocatore."""
    return get_trades(player_id)


@router.post("/{player_id}/trade")
def api_execute_trade(player_id: int, trade: TradeRequest):
    """
    Esegue un ordine di acquisto o vendita.

    Body:
    - security_id: ID del titolo
    - type: 'BUY' o 'SELL'
    - quantity: quantita' di azioni
    """
    if trade.type not in ("BUY", "SELL"):
        raise HTTPException(status_code=400, detail="Type must be 'BUY' or 'SELL'")
    if trade.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    try:
        result = execute_trade(player_id, trade.security_id, trade.type, trade.quantity)
        return result
    except PlayerNotFoundError:
        raise HTTPException(status_code=404, detail="Player not found")
    except SecurityNotFoundError:
        raise HTTPException(status_code=404, detail="Security not found")
    except InsufficientFundsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InsufficientSharesError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidGamePhaseError as e:
        raise HTTPException(status_code=409, detail=str(e))
