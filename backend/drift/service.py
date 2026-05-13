"""
Drift Service - Calcola e applica il baseline drift strutturale per ogni titolo.

Il drift rappresenta il movimento naturale di prezzo dovuto a fattori strutturali
(trend di settore, qualita aziendale, valuation, noise) e non legato a eventi.

Formula per ciclo:
  drift = uniform(trend_low, trend_high) * intensity_mult * quality_mod * val_pressure
          + gauss(0, noise_std)
"""

import random

from backend.persistence.database import get_db
from backend.persistence import repositories as repo
from database.baseline_data import (
    SECTOR_BASELINES,
    TREND_DRIFT_RANGE,
    INTENSITY_MULTIPLIER,
    VOLATILITY_NOISE,
    QUALITY_DRIFT_MODIFIER,
    VALUATION_PRESSURE,
    STOCK_PROFILES,
)


def compute_baseline_drift(ticker: str, sector: str) -> float:
    """
    Calcola il drift % per un singolo titolo in un ciclo.

    Componenti:
    1. Trend range del settore -> uniform()
    2. Intensity multiplier del settore
    3. Quality modifier del titolo
    4. Valuation pressure del titolo
    5. Noise gaussiano dalla volatilita del settore
    """
    # Profilo settore
    sector_data = SECTOR_BASELINES.get(sector, SECTOR_BASELINES.get("Tech"))
    trend_label = sector_data["trend"]
    intensity_label = sector_data["intensity"]
    volatility_label = sector_data["volatility"]

    # Profilo titolo
    profile = STOCK_PROFILES.get(ticker, {"quality": "neutro", "valuation_label": "medio_pe"})
    quality_label = profile["quality"]
    valuation_label = profile["valuation_label"]

    # 1. Trend base: range dal settore
    trend_low, trend_high = TREND_DRIFT_RANGE.get(trend_label, (-0.5, 0.5))
    base = random.uniform(trend_low, trend_high)

    # 2. Intensity: amplifica/smorza il drift
    intensity_mult = INTENSITY_MULTIPLIER.get(intensity_label, 1.0)

    # 3. Quality: titoli di alta qualita driftano di piu nella direzione del trend
    quality_mod = QUALITY_DRIFT_MODIFIER.get(quality_label, 0.70)

    # 4. Valuation pressure: PE alti frenano la crescita
    val_pressure = VALUATION_PRESSURE.get(valuation_label, 1.00)

    # 5. Noise: componente casuale, scalata per beta (piu volatile = piu rumore)
    noise_std = VOLATILITY_NOISE.get(volatility_label, 0.8)
    beta = profile.get("beta", 1.0)

    # Formula finale
    drift = base * intensity_mult * quality_mod * val_pressure + random.gauss(0, noise_std * beta)

    return round(drift, 4)


def apply_baseline_drift(cycle_number: int):
    """
    Calcola e salva il drift strutturale per tutti i 41 titoli del ciclo.

    Il drift viene poi integrato nel modulo impact/service.py
    durante l'applicazione degli impatti ai prezzi.
    """
    conn = get_db()
    try:
        securities = repo.get_all_securities(conn)

        for sec in securities:
            ticker = sec["ticker"]
            sector = sec["sector"]
            drift_pct = compute_baseline_drift(ticker, sector)
            repo.save_baseline_drift(conn, sec["id"], cycle_number, drift_pct)

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
