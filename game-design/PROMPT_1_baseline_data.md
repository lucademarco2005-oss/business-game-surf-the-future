# PROMPT 1 — Aggiornamento `database/baseline_data.py`

## Obiettivo
Sostituire completamente il file `database/baseline_data.py` con la nuova struttura a **8 settori × 4 aziende = 32 titoli** allineata alla giornata formativa "Surf the Future" (STF) di Allianz Bank.

## File da modificare
`database/baseline_data.py`

## Istruzione
Sostituisci il contenuto COMPLETO del file con il codice Python qui sotto.
Mantieni **invariati** tutti gli altri file del software.

---

```python
"""
Baseline Data - Drift strutturale per settori e singoli titoli.

Ogni titolo ha un drift per-ciclo composto da:
  1. Trend di settore
  2. Qualita aziendale
  3. Valuation pressure
  4. Noise (volatilita settoriale)
"""

# ── SECTOR BASELINES ────────────────────────────────────────────
# Direzione naturale di ciascun settore nella fase storica corrente.

SECTOR_BASELINES = {
    "Biotech & Gene Therapy": {
        "trend": "neutro_positiva",
        "intensity": "media",
        "volatility": "alta",
    },
    "AI Drug Discovery": {
        "trend": "molto_positiva",
        "intensity": "alta",
        "volatility": "alta",
    },
    "Robotics & Automation": {
        "trend": "positiva",
        "intensity": "media-alta",
        "volatility": "media-alta",
    },
    "Semiconductor & AI Infra": {
        "trend": "molto_positiva",
        "intensity": "alta",
        "volatility": "alta",
    },
    "Nuclear & Clean Energy": {
        "trend": "positiva",
        "intensity": "alta",
        "volatility": "alta",
    },
    "Healthcare Systems": {
        "trend": "neutro_positiva",
        "intensity": "media",
        "volatility": "bassa-media",
    },
    "Logistics & Supply Chain": {
        "trend": "neutro_negativa",
        "intensity": "bassa-media",
        "volatility": "media",
    },
    "Food & AgriTech": {
        "trend": "neutro_positiva",
        "intensity": "bassa-media",
        "volatility": "bassa",
    },
}

# ── TREND DRIFT RANGE (% per ciclo) ────────────────────────────
# Range dal quale viene estratto il drift base con uniform()

TREND_DRIFT_RANGE = {
    "molto_positiva":  (+2.0, +5.0),
    "positiva":        (+0.5, +3.0),
    "neutro_positiva": (+0.0, +1.5),
    "neutro":          (-0.5, +0.5),
    "neutro_negativa": (-1.5, +0.0),
    "negativa":        (-3.0, -0.5),
}

# ── INTENSITY MULTIPLIER ────────────────────────────────────────
# Amplifica o smorza il drift base in base all'intensita del settore

INTENSITY_MULTIPLIER = {
    "bassa":       0.6,
    "bassa-media": 0.8,
    "media":       1.0,
    "media-alta":  1.2,
    "alta":        1.5,
}

# ── VOLATILITY NOISE (deviazione standard per gauss) ─────────────
# Rumore random aggiunto al drift per rendere non-deterministico

VOLATILITY_NOISE = {
    "bassa":       0.3,
    "bassa-media": 0.5,
    "media":       0.8,
    "media-alta":  1.2,
    "alta":        1.8,
}

# ── QUALITY DRIFT MODIFIER ──────────────────────────────────────
# Moltiplica il drift base in base alla qualita del titolo

QUALITY_DRIFT_MODIFIER = {
    "leader_strutturale":     1.20,
    "molto_positiva":         1.40,
    "crescita_selettiva":     1.00,
    "positivo_moderato":      0.90,
    "positivo_solido":        1.05,
    "positivo_tecnico":       0.95,
    "positivo_volatile":      1.10,
    "positivo_accelerazione": 1.05,
    "difensivo":              0.60,
    "difensivo_qualita":      0.65,
    "vulnerabile":            0.50,
    "turnaround":             0.55,
    "neutro_positiva":        0.80,
    "neutro_negativo":        0.40,
    "neutro":                 0.70,
    "positivo_ciclico":       0.95,
    "positivo_stabile":       0.85,
    "positivo_difensivo":     0.75,
    "positivo_industrial":    0.90,
    "positivo_sensibile":     0.90,
    "fragile":                0.45,
}

# ── VALUATION PRESSURE ──────────────────────────────────────────
# Titoli con PE/aspettative alte crescono meno facilmente

VALUATION_PRESSURE = {
    "altissima_aspettativa": 0.85,
    "alta_aspettativa":      0.88,
    "alto_pe":               0.90,
    "medio_pe":              1.00,
    "basso_pe":              1.10,
    "negativo_eps":          0.70,
    "value":                 1.05,
}

# ── STOCK PROFILES ───────────────────────────────────────────────
# Profilo per ciascuno dei 32 titoli.
# quality: label qualitativa
# valuation_label: pressione di valutazione
# cap_class: classe per i cap single-event (large_cap|high_vol|defensive)
# shock_sensitivity: moltiplicatore sensibilita agli shock (>1 = piu sensibile)
# beta: sensibilita al mercato

STOCK_PROFILES = {

    # ── BIOTECH & GENE THERAPY (4) ──
    "BNTX":  {"quality": "positivo_volatile",        "valuation_label": "negativo_eps",          "cap_class": "large_cap",  "shock_sensitivity": 1.3,  "beta": 1.53},
    "MRNA":  {"quality": "turnaround",               "valuation_label": "negativo_eps",          "cap_class": "high_vol",   "shock_sensitivity": 1.5,  "beta": 1.80},
    "VRTX":  {"quality": "molto_positiva",           "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 0.8,  "beta": 0.31},
    "CRSP":  {"quality": "fragile",                  "valuation_label": "negativo_eps",          "cap_class": "high_vol",   "shock_sensitivity": 2.0,  "beta": 1.70},

    # ── AI DRUG DISCOVERY (4) ──
    "RXRX":  {"quality": "fragile",                  "valuation_label": "negativo_eps",          "cap_class": "high_vol",   "shock_sensitivity": 2.5,  "beta": 2.00},
    "SDGR":  {"quality": "fragile",                  "valuation_label": "negativo_eps",          "cap_class": "high_vol",   "shock_sensitivity": 2.0,  "beta": 1.80},
    "ILMN":  {"quality": "neutro_positiva",          "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 0.9,  "beta": 1.40},
    "GOOGL": {"quality": "leader_strutturale",       "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 0.8,  "beta": 1.11},

    # ── ROBOTICS & AUTOMATION (4) ──
    "ISRG":  {"quality": "molto_positiva",           "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 0.8,  "beta": 1.68},
    "ABB":   {"quality": "positivo_industrial",      "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 0.8,  "beta": 0.90},
    "TER":   {"quality": "positivo_volatile",        "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 1.1,  "beta": 1.50},
    "ROK":   {"quality": "positivo_solido",          "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 0.9,  "beta": 1.00},

    # ── SEMICONDUCTOR & AI INFRA (4) ──
    "NVDA":  {"quality": "molto_positiva",           "valuation_label": "altissima_aspettativa", "cap_class": "high_vol",   "shock_sensitivity": 1.3,  "beta": 2.38},
    "INTC":  {"quality": "turnaround",               "valuation_label": "negativo_eps",          "cap_class": "large_cap",  "shock_sensitivity": 1.2,  "beta": 1.20},
    "AVGO":  {"quality": "molto_positiva",           "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 1.26},
    "ASML":  {"quality": "leader_strutturale",       "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 0.9,  "beta": 1.43},

    # ── NUCLEAR & CLEAN ENERGY (4) ──
    "CEG":   {"quality": "positivo_accelerazione",   "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 0.70},
    "VST":   {"quality": "positivo_solido",          "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 0.80},
    "OKLO":  {"quality": "fragile",                  "valuation_label": "negativo_eps",          "cap_class": "high_vol",   "shock_sensitivity": 3.0,  "beta": 2.50},
    "CCJ":   {"quality": "positivo_ciclico",         "valuation_label": "alto_pe",               "cap_class": "large_cap",  "shock_sensitivity": 1.2,  "beta": 0.90},

    # ── HEALTHCARE SYSTEMS (4) ──
    "UNH":   {"quality": "vulnerabile",              "valuation_label": "basso_pe",              "cap_class": "defensive",  "shock_sensitivity": 0.7,  "beta": 0.38},
    "LLY":   {"quality": "molto_positiva",           "valuation_label": "altissima_aspettativa", "cap_class": "large_cap",  "shock_sensitivity": 0.7,  "beta": 0.43},
    "AZN":   {"quality": "positivo_solido",          "valuation_label": "medio_pe",              "cap_class": "defensive",  "shock_sensitivity": 0.5,  "beta": 0.23},
    "MDT":   {"quality": "difensivo_qualita",        "valuation_label": "medio_pe",              "cap_class": "defensive",  "shock_sensitivity": 0.5,  "beta": 0.55},

    # ── LOGISTICS & SUPPLY CHAIN (4) ──
    "UPS":   {"quality": "neutro_negativo",          "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 1.05},
    "FDX":   {"quality": "neutro_positiva",          "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 1.28},
    "AMZN":  {"quality": "leader_strutturale",       "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 1.42},
    "XPO":   {"quality": "positivo_ciclico",         "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.2,  "beta": 1.50},

    # ── FOOD & AGRITECH (4) ──
    "DE":    {"quality": "neutro_positiva",          "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 0.9,  "beta": 0.96},
    "CTVA":  {"quality": "positivo_moderato",        "valuation_label": "medio_pe",              "cap_class": "large_cap",  "shock_sensitivity": 0.8,  "beta": 0.85},
    "AGCO":  {"quality": "positivo_ciclico",         "valuation_label": "basso_pe",              "cap_class": "large_cap",  "shock_sensitivity": 1.0,  "beta": 1.00},
    "ADM":   {"quality": "vulnerabile",              "valuation_label": "basso_pe",              "cap_class": "large_cap",  "shock_sensitivity": 0.9,  "beta": 0.70},
}
```

---

## Note
- Non modificare nessun altro file del progetto.
- I nomi dei settori (es. `"Biotech & Gene Therapy"`) devono corrispondere esattamente a quelli usati in `database/seed.py`.
- Tutte le costanti di calibrazione (`TREND_DRIFT_RANGE`, `INTENSITY_MULTIPLIER`, `VOLATILITY_NOISE`, `QUALITY_DRIFT_MODIFIER`, `VALUATION_PRESSURE`) rimangono invariate rispetto alla versione precedente.
