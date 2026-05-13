# PROMPT 3 — Aggiornamento `database/events_data.py`

## Obiettivo
Sostituire completamente il file `database/events_data.py` con i **25 nuovi eventi** STF-aligned e la lista `_ALL_TICKERS` aggiornata ai **32 nuovi titoli** del portfolio.

## File da modificare
`database/events_data.py`

## Istruzione
Sostituisci il contenuto COMPLETO del file con il codice Python qui sotto.
**NON toccare nessun altro file del progetto.**

### Cosa cambia rispetto alla versione precedente:
- `_ALL_TICKERS`: da 61 a 32 ticker (nuovi settori STF)
- `CATASTROPHIC_EVENT_IDS`: aggiornati agli ID dei 4 eventi catastrofici nuovi
- `GAME_EVENTS`: da 19 a 25 eventi, completamente rimpiazzati
- **Costanti di calibrazione invariate** (`FUNDAMENTAL_RATIOS`, `EVENTS_PER_CYCLE`, `SINGLE_EVENT_CAPS`, `MULTI_EVENT_SCALE`, `ANTI_CATASTROPHE_*`, `ANTI_EUPHORIA_*`, `BETA_*`, `CATASTROPHIC_CAP_OVERRIDES`)

---

```python
"""
Definizione dei 25 eventi di gioco, costanti di calibrazione e variabili interne.
Business Game 'Surf the Future' — Allianz Bank.

Ogni evento ha 7 layer (tone, scope, origin_region, initial_intensity,
duration_class, decay_pattern, propagation) e impatti espliciti per ticker.

Il decay e' PER-EVENTO (persistence) e non piu' globale.
32 titoli | 8 settori | 25 eventi STF-aligned.
"""

# ── RAPPORTI IMPATTO FONDAMENTALI ────────────────────────────────
FUNDAMENTAL_RATIOS = {
    "revenue":      0.50,
    "ebitda":       0.60,
    "eps":          0.80,
    "roi":          0.40,
    "roe":          0.40,
    "target_price": 0.70,
    "market_cap":   1.00,
}

# ── COSTANTI DI CALIBRAZIONE ────────────────────────────────────
EVENTS_PER_CYCLE = 3

SINGLE_EVENT_CAPS = {
    "large_cap":  12.0,
    "high_vol":   16.0,
    "defensive":   6.0,
}

MULTI_EVENT_SCALE = [1.00, 0.70, 0.50, 0.30]

ANTI_CATASTROPHE_THRESHOLD = 3
ANTI_CATASTROPHE_REDUCE_PCT = 0.175

ANTI_EUPHORIA_THRESHOLD = 3
ANTI_EUPHORIA_COMPRESS_PCT = 0.15

# ── BETA MODULATION ──────────────────────────────────────────────
BETA_DAMPENING = 0.70
BETA_IMPACT_WEIGHT = 0.30

# ── CATASTROPHIC EVENT OVERRIDES ────────────────────────────────
CATASTROPHIC_CAP_OVERRIDES = {
    "large_cap":  18.0,
    "high_vol":   24.0,
    "defensive":   9.0,
}
CATASTROPHIC_EVENT_IDS = {"9", "12", "19", "20"}
CATASTROPHIC_ANTI_REDUCE_PCT = 0.08

# ── VARIABILI INTERNE (12 variabili astratte per azienda) ────────
INTERNAL_VARIABLES = [
    "ricavi_attesi",
    "margini_attesi",
    "costi_operativi",
    "capex_attesi",
    "rischio_supply_chain",
    "rischio_regolatorio",
    "domanda_finale",
    "visibilita_utili",
    "multiplo_tollerato",
    "volatilita_attesa",
    "momentum_percepito",
    "fragilita_strategica",
]

INTERNAL_VARIABLE_DEFAULTS = {v: 50.0 for v in INTERNAL_VARIABLES}

# ── ZERO IMPACT DEFAULTS ────────────────────────────────────────
_ALL_TICKERS = [
    # Biotech & Gene Therapy
    "BNTX", "MRNA", "VRTX", "CRSP",
    # AI Drug Discovery
    "RXRX", "SDGR", "ILMN", "GOOGL",
    # Robotics & Automation
    "ISRG", "ABB", "TER", "ROK",
    # Semiconductor & AI Infra
    "NVDA", "INTC", "AVGO", "ASML",
    # Nuclear & Clean Energy
    "CEG", "VST", "OKLO", "CCJ",
    # Healthcare Systems
    "UNH", "LLY", "AZN", "MDT",
    # Logistics & Supply Chain
    "UPS", "FDX", "AMZN", "XPO",
    # Food & AgriTech
    "DE", "CTVA", "AGCO", "ADM",
]


def _fill(impacts: dict) -> dict:
    """Riempie tutti i ticker mancanti con 0.0"""
    full = {t: 0.0 for t in _ALL_TICKERS}
    full.update(impacts)
    return full


# ═══════════════════════════════════════════════════════════════════
# ██  25 EVENTI DI GIOCO — STF SURF THE FUTURE EDITION           ██
# ═══════════════════════════════════════════════════════════════════

GAME_EVENTS = [

    # ── EVENTO 1 — NeuroMend ────────────────────────────────────
    {
        "event_id": "1",
        "title": "Farmaco AI cura l'Alzheimer precoce: trial da 94% di efficacia, approvazione FDA accelerata",
        "body": (
            "Un farmaco interamente progettato da Recursion Pharmaceuticals usando "
            "intelligenza artificiale ottiene i risultati del trial di Fase 3: il 94% "
            "dei pazienti con Alzheimer precoce mostra arresto della progressione a 18 "
            "mesi. La FDA concede l'approvazione accelerata. Il farmaco diventa il piu' "
            "venduto nella storia in 90 giorni. Boom degli investimenti in AI farmaceutica, "
            "rush di partnership tra Big Pharma e startup AI, rialzo generalizzato del "
            "settore biotech."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "ibrido",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "C",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # AI Drug Discovery: +++ (RXRX è il protagonista)
            "RXRX": +12.0, "SDGR": +10.0, "ILMN": +8.0, "GOOGL": +5.0,
            # Biotech: +++
            "BNTX": +9.0, "MRNA": +9.0, "VRTX": +7.0, "CRSP": +8.0,
            # Healthcare: ++
            "LLY": +6.0, "AZN": +5.0, "MDT": +3.0, "UNH": +3.0,
            # Semiconductor: + (chip per AI)
            "NVDA": +3.0, "INTC": +2.0, "AVGO": +2.0, "ASML": +1.5,
            # Logistics: + (cold chain farmaci)
            "UPS": +2.0, "FDX": +2.0, "AMZN": +1.5, "XPO": +1.5,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.70, 4: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "ricavi_attesi": +12, "domanda_finale": +10,
            "multiplo_tollerato": +8, "momentum_percepito": +15,
            "volatilita_attesa": +5,
        },
    },

    # ── EVENTO 2 — OmniShield ───────────────────────────────────
    {
        "event_id": "2",
        "title": "Piattaforma mRNA universale ottiene fast-track FDA per 3 tumori simultaneamente",
        "body": (
            "BioNTech presenta all'FDA la sua piattaforma mRNA oncologica di terza "
            "generazione. Per la prima volta nella storia, un'unica piattaforma ottiene "
            "fast-track per tre indicazioni contemporaneamente: tumore al pancreas, melanoma "
            "metastatico e glioblastoma. I dati mostrano sopravvivenza a 5 anni del 67% "
            "vs 18% dello standard attuale. Shift massiccio di capitali verso mRNA "
            "oncologico. Aumento atteso della domanda ospedaliera e segnale positivo "
            "per tutta la catena di fornitura biotech."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "verticale",
        "origin_region": "Europe",
        "initial_intensity": "alta",
        "duration_class": "C",
        "decay_pattern": "Wave",
        "propagation": "sistemica",
        "impacts": _fill({
            # Biotech: +++ (BNTX è protagonista)
            "BNTX": +14.0, "MRNA": +9.0, "VRTX": +7.0, "CRSP": +5.0,
            # AI Drug Discovery: ++
            "RXRX": +6.0, "SDGR": +5.0, "ILMN": +6.0, "GOOGL": +3.0,
            # Healthcare: ++
            "LLY": +5.0, "AZN": +5.0, "MDT": +3.0, "UNH": +3.0,
            # Logistics cold chain: +
            "UPS": +2.0, "FDX": +2.0, "AMZN": +1.5, "XPO": +1.5,
            # Food: - (capitali si spostano)
            "DE": -1.5, "CTVA": -1.5, "AGCO": -1.0, "ADM": -1.0,
        }),
        "persistence": {1: 0.80, 2: 1.00, 3: 0.60},
        "persistence_filter": {},
        "variable_updates": {
            "ricavi_attesi": +15, "domanda_finale": +12,
            "multiplo_tollerato": +10, "momentum_percepito": +18,
        },
    },

    # ── EVENTO 3 — WetWare Primo Sangue ─────────────────────────
    # STF: La Quarta Scienza / Il Living Computer
    {
        "event_id": "3",
        "title": "Primo biocomputer commerciale certifica 0.5W per task medici — boom da $3B in 90 giorni",
        "body": (
            "Cortical Labs ottiene la certificazione CE e FDA per il suo SBI-1 (Silicon "
            "Brain Interface): un biocomputer ibrido silicio-neuroni che elabora task di "
            "classificazione biomedica a 0.5W di consumo, contro i 300W di un server GPU "
            "equivalente. Tre grandi hedge fund annunciano investimenti da $3 miliardi in "
            "startup wetware. Il termine OI (Organoid Intelligence) entra nel lessico "
            "finanziario. Le universita' con laboratori di neuroscienze computazionali "
            "ricevono offerte di acquisizione. I chip GPU tradizionali non crollano subito, "
            "ma perdono la narrativa: gli investitori iniziano a prezzare il rischio di "
            "disintermediazione futura."
        ),
        "category": "tech_disruption",
        "tone": "ambiguo",
        "scope": "ibrido",
        "origin_region": "Europe",
        "initial_intensity": "media",
        "duration_class": "B",
        "decay_pattern": "Wave",
        "propagation": "sistemica",
        "impacts": _fill({
            # AI Drug Discovery: +++ (analisi molecolare real-time a costo zero)
            "RXRX": +11.0, "SDGR": +10.0, "ILMN": +8.0, "GOOGL": +4.0,
            # Healthcare: +++ (diagnostica edge in ospedali)
            "MDT": +10.0, "LLY": +5.0, "AZN": +5.0, "UNH": +4.0,
            # Biotech: ++ (competenze bio diventano tech)
            "BNTX": +5.0, "MRNA": +5.0, "VRTX": +4.0, "CRSP": +5.0,
            # Robotics: ++ (AI on-body praticabile per robot medici)
            "ISRG": +7.0, "ABB": +3.0, "TER": +4.0, "ROK": +2.0,
            # Semiconductor GPU: -- (quota computing si sposta)
            "NVDA": -7.0, "AVGO": -5.0, "ASML": -3.0,
            # Intel: + (neuromorphic play — wetware beneficia il paradigma)
            "INTC": +5.0,
            # Nuclear: + (meno energia nel lungo periodo)
            "CEG": +2.0, "VST": +2.0,
        }),
        "persistence": {1: 0.80, 2: 0.50},
        "persistence_filter": {},
        "variable_updates": {
            "capex_attesi": +8, "multiplo_tollerato": +6,
            "volatilita_attesa": +10, "momentum_percepito": +10,
            "fragilita_strategica": +5,
        },
    },

    # ── EVENTO 4 — FDA Freeze ────────────────────────────────────
    {
        "event_id": "4",
        "title": "FDA sospende tutte le revisioni di terapie geniche: 14 aziende colpite",
        "body": (
            "Dopo effetti collaterali gravi non riportati in un trial di Fase 2 per una "
            "terapia genica oncologica, l'FDA emette un'ordinanza di emergenza: sospensione "
            "di tutte le revisioni in corso per terapie geniche per 120 giorni. 14 aziende "
            "biotech perdono la finestra di approvazione critica. Due di loro devono "
            "raccogliere capitali di emergenza. Incertezza regolatoria massima. Il M&A "
            "si blocca. Gli investitori istituzionali riducono l'esposizione biotech."
        ),
        "category": "regolamentazione",
        "tone": "negativo",
        "scope": "verticale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Linear",
        "propagation": "diretta",
        "impacts": _fill({
            # Biotech: ---
            "BNTX": -10.0, "MRNA": -10.0, "VRTX": -9.0, "CRSP": -13.0,
            # AI Drug Discovery: --
            "RXRX": -8.0, "SDGR": -7.0, "ILMN": -4.0, "GOOGL": -2.0,
            # Healthcare: -
            "LLY": -3.0, "AZN": -3.0, "MDT": -2.0, "UNH": -2.0,
            # Logistics: -
            "UPS": -2.0, "FDX": -2.0, "AMZN": -1.0, "XPO": -1.0,
            # Nuclear: + (rotazione difensiva)
            "CEG": +2.0, "VST": +2.0, "OKLO": +1.0, "CCJ": +1.0,
        }),
        "persistence": {1: 0.60, 2: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +20, "visibilita_utili": -15,
            "volatilita_attesa": +15, "multiplo_tollerato": -8,
            "fragilita_strategica": +10,
        },
    },

    # ── EVENTO 5 — PriceWar Farmaceutico ────────────────────────
    {
        "event_id": "5",
        "title": "Il governo USA impone tetti di prezzo: ricavi biotech tagliati fino al 40%",
        "body": (
            "Il Congresso approva il Drug Pricing Sovereignty Act: tetti di prezzo "
            "obbligatori su 120 farmaci biologici chiave, calcolati su base europea. "
            "Per le aziende biotech con piu' del 60% dei ricavi USA, l'impatto e' "
            "immediato. Gli assicuratori guadagnano dal ribasso costi. I pazienti "
            "risparmiano ma l'innovazione rallenta. Alcune pipeline vengono cancellate. "
            "Gli investimenti privati in R&D si riducono strutturalmente."
        ),
        "category": "regolamentazione",
        "tone": "negativo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Biotech: ---
            "BNTX": -10.0, "MRNA": -11.0, "VRTX": -12.0, "CRSP": -8.0,
            # AI Drug Discovery: --
            "RXRX": -7.0, "SDGR": -5.0, "ILMN": -4.0, "GOOGL": -2.0,
            # Healthcare: assicuratori ++ / pharma --
            "UNH": +8.0, "LLY": -8.0, "AZN": -6.0, "MDT": -2.0,
            # Logistics: lieve negativo
            "UPS": -1.5, "FDX": -1.5, "AMZN": -1.0, "XPO": -1.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.40},
        "persistence_filter": {},
        "variable_updates": {
            "ricavi_attesi": -15, "margini_attesi": -12,
            "rischio_regolatorio": +18, "capex_attesi": -10,
            "visibilita_utili": -10,
        },
    },

    # ── EVENTO 6 — EU Tech Gap: L'Allarme ───────────────────────
    # STF: La Quarta Scienza / EU AI Sovereignty
    {
        "event_id": "6",
        "title": "Rapporto Draghi 2.0: zero aziende EU sopra $100B in tech. Cina al 61% dei brevetti AI",
        "body": (
            "La Commissione Europea pubblica il Draghi Report II: nessuna azienda europea "
            "fondata negli ultimi 40 anni ha raggiunto $100B di capitalizzazione in "
            "tecnologia. La Cina detiene il 61% dei brevetti AI globali. In risposta, "
            "l'UE annuncia il European AI Sovereignty Fund: €500 miliardi in 7 anni per "
            "finanziare 5 'AI Champions' europei. ASML riceve un contratto preferenziale "
            "da €40 miliardi. ABB viene designata 'strategic industrial asset'. "
            "I competitor USA e asiatici che operano in EU iniziano a perdere contratti "
            "pubblici. Il fondo crea un'industria parassita di consulenza: le aziende "
            "meglio posizionate politicamente vincono, non necessariamente le migliori."
        ),
        "category": "geopolitica",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "Europe",
        "initial_intensity": "media",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # ASML: +++ (contratti preferenziali EU garantiti)
            "ASML": +12.0,
            # ABB: +++ (strategic asset designation)
            "ABB": +12.0,
            # Semiconductor USA: -- (competizione geopolitica aumenta)
            "NVDA": -6.0, "AVGO": -5.0, "INTC": -4.0,
            # BNTX: + (EU company, beneficia del fondo EU biotech)
            "BNTX": +3.0,
            # AI Drug Discovery EU: ++
            "SDGR": +3.0, "ILMN": +3.0,
            # Biotech USA: -
            "MRNA": -2.0, "VRTX": -1.5, "CRSP": -1.0,
            # Googl: -- (pressione competitiva EU)
            "GOOGL": -3.0,
            # Robotics USA/Asia: --
            "ISRG": -2.0, "TER": -2.0, "ROK": -2.0,
            # Nuclear EU: ++
            "CEG": +2.0, "VST": +1.5, "CCJ": +2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +10, "capex_attesi": +12,
            "multiplo_tollerato": +5, "momentum_percepito": +8,
        },
    },

    # ── EVENTO 7 — Soglia Cobot ──────────────────────────────────
    # STF: Agentic Logistics / Embodied AI
    {
        "event_id": "7",
        "title": "Universal Robots lancia cobot a €6.500: 400.000 PMI europee pre-ordinano in 60 giorni",
        "body": (
            "Universal Robots annuncia il UR3e Lite al prezzo di €6.500 — il precedente "
            "entry-level era €28.000. Il cobot pesa 11kg, si installa in 2 ore, non "
            "richiede gabbie di protezione e si ripaga in 8 mesi con il costo del lavoro "
            "minimo EU. In 60 giorni, 400.000 PMI europee effettuano pre-ordini. Il settore "
            "manifatturiero europeo richiede 2 milioni di cobot nei prossimi 3 anni. "
            "I lavoratori sostituiti creano pressione politica. I governi rispondono con "
            "sussidi all'adozione. La domanda supera la capacita' produttiva: anche "
            "i competitor vedono i backlog esplodere. Trappola: i margini hardware si "
            "comprimono con il prezzo basso — l'opportunita' e' nel lungo periodo."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "trasversale",
        "origin_region": "Europe",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Robotics: +++
            "ISRG": +7.0, "ABB": +10.0, "TER": +12.0, "ROK": +9.0,
            # Semiconductor: +++ (milioni di robot = milioni di chip AI)
            "NVDA": +8.0, "INTC": +5.0, "AVGO": +6.0, "ASML": +4.0,
            # Logistics: +++ (automazione magazzini PMI)
            "UPS": +7.0, "FDX": +6.0, "AMZN": +9.0, "XPO": +8.0,
            # Food: ++ (packaging, sorting nelle medie imprese)
            "DE": +5.0, "AGCO": +5.0, "CTVA": +3.0, "ADM": +2.0,
            # Healthcare: +
            "MDT": +4.0, "LLY": +3.0, "AZN": +2.0, "UNH": +2.0,
            # AI Drug Discovery: + (laboratori pharma si automatizzano)
            "RXRX": +3.0, "SDGR": +2.0, "ILMN": +2.0, "GOOGL": +2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.60},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: i cobot in esercizio generano dati → platform SaaS
            1: {"TER": +5.0, "ROK": +4.0, "ABB": +4.0, "AMZN": +4.0},
            # Ciclo +2: l'adozione PMI si normalizza, backlog si smaltisce
            2: {"TER": +3.0, "NVDA": +3.0, "AVGO": +3.0},
        },
        "variable_updates": {
            "domanda_finale": +15, "capex_attesi": +12, "costi_operativi": -8,
            "multiplo_tollerato": +10, "momentum_percepito": +20,
        },
    },

    # ── EVENTO 8 — Ciclo di Apprendimento ───────────────────────
    # STF: La Quarta Scienza / Ciclo ipotesi-test-valida
    {
        "event_id": "8",
        "title": "Isomorphic Labs brevetta 40 molecole in un trimestre: il ciclo scende da 18 mesi a 6 settimane",
        "body": (
            "Isomorphic Labs pubblica il rapporto annuale: ha completato il ciclo completo "
            "di drug discovery — ipotesi, simulazione molecolare, sintesi predittiva, "
            "validazione computazionale — in media in 6 settimane per candidato (erano "
            "18 mesi l'anno precedente). Deposita 40 brevetti in un solo trimestre. Le "
            "prime tre molecole entrano in Fase 1. Il New England Journal of Medicine "
            "pubblica un editoriale: 'La pipeline farmaceutica tradizionale e' obsoleta.' "
            "Tre Big Pharma tagliano il 30% dei team wet lab. I 40 brevetti creano "
            "un 'brevetto picket fence' attorno a intere classi molecolari. Le universita' "
            "perdono fondi da Big Pharma. Trappola: il brevetto non e' il farmaco approvato."
        ),
        "category": "tech_disruption",
        "tone": "ambiguo",
        "scope": "ibrido",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # AI Drug Discovery: +++ (GOOGL/Isomorphic Labs è protagonista)
            "RXRX": +12.0, "SDGR": +11.0, "ILMN": +9.0, "GOOGL": +10.0,
            # Biotech AI-native: +++
            "CRSP": +10.0, "MRNA": +8.0, "BNTX": +8.0, "VRTX": +4.0,
            # Healthcare: ++ (pipeline piu' veloci)
            "LLY": +7.0, "AZN": +6.0, "MDT": +3.0, "UNH": +2.0,
            # Semiconductor: ++ (piu' computing per piu' esperimenti)
            "NVDA": +5.0, "INTC": +3.0, "AVGO": +4.0, "ASML": +3.0,
            # Logistics: + (piu' farmaci da distribuire)
            "UPS": +2.0, "FDX": +2.0, "AMZN": +2.0, "XPO": +1.5,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: molecole in Fase 1 generano dati clinici
            1: {"RXRX": +6.0, "GOOGL": +4.0, "LLY": +5.0, "AZN": +4.0},
            # Ciclo +2: se almeno una passa, il modello diventa industria-wide
            2: {"ILMN": +4.0, "SDGR": +5.0, "NVDA": +3.0},
        },
        "variable_updates": {
            "ricavi_attesi": +10, "capex_attesi": +15, "domanda_finale": +8,
            "multiplo_tollerato": +12, "momentum_percepito": +18,
        },
    },

    # ── EVENTO 9 — RoboCrash ─────────────────────────────────────
    # CATASTROFICO (cap_override: True)
    {
        "event_id": "9",
        "title": "Robot umanoide causa 3 morti in fabbrica: blocco europeo di 18 mesi per l'AI Act",
        "body": (
            "Un robot umanoide di terza generazione in uno stabilimento farmaceutico in "
            "Belgio perde il controllo per un aggiornamento software difettoso e causa la "
            "morte di 3 operai. L'UE attiva immediatamente il Regulation 47 dell'AI Act: "
            "sospensione di tutti i deployment di robot umanoidi in ambienti con operatori "
            "umani, per 18 mesi. I settori che usano robot in prossimita' di persone "
            "bloccano i deployment. Panico nel settore. Le azioni robotics perdono il "
            "30-40% in 3 giorni. I robot industriali tradizionali con gabbie di sicurezza "
            "beneficiano per contrasto."
        ),
        "category": "cigno_nero",
        "tone": "negativo",
        "scope": "trasversale",
        "origin_region": "Europe",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Spike",
        "propagation": "sistemica",
        "cap_override": True,
        "impacts": _fill({
            # Robotics: ---
            "ISRG": -10.0, "ABB": -10.0, "TER": -11.0, "ROK": -7.0,
            # Semiconductor: -- (meno domanda chip robot)
            "NVDA": -6.0, "INTC": -4.0, "AVGO": -5.0, "ASML": -3.0,
            # Healthcare: - (delay robot chirurgici)
            "MDT": -5.0, "UNH": -2.0, "LLY": -1.5, "AZN": -1.5,
            # Logistics: -- (automazione magazzini in stallo)
            "UPS": -5.0, "FDX": -5.0, "AMZN": -7.0, "XPO": -5.0,
            # AI Drug Discovery: - (lab robots affected, sentiment AI negativo)
            "RXRX": -3.0, "SDGR": -2.0, "ILMN": -2.0, "GOOGL": -1.5,
            # Nuclear: + (capitali rotano su infrastruttura stabile)
            "CEG": +3.0, "VST": +2.0, "OKLO": +1.0, "CCJ": +1.0,
        }),
        "persistence": {1: 0.50, 2: 0.20},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +25, "volatilita_attesa": +20,
            "fragilita_strategica": +15, "multiplo_tollerato": -10,
            "visibilita_utili": -12,
        },
    },

    # ── EVENTO 10 — Paradosso Risolto ────────────────────────────
    # STF: Agentic Logistics / Paradosso di Moravec
    {
        "event_id": "10",
        "title": "Boston Dynamics Atlas piega la biancheria in appartamento sconosciuto: il mercato umanoide triplica",
        "body": (
            "Boston Dynamics dimostra che Atlas v5 completa un task domestico complesso — "
            "ritirare biancheria stesa, piegarla e riporla in un cassetto in un appartamento "
            "mai visto, illuminazione variabile, oggetti sparsi a caso — senza guida remota "
            "e con zero errori. Bloomberg titola: 'Il Paradosso di Moravec e' risolto.' "
            "Le stime del mercato indirizzabile per umanoidi domestici e assistenziali "
            "passano da $40B a $120B in una settimana. Il settore delle case di cura "
            "per anziani in EU (6 milioni di posti letto, crisi cronica di personale) "
            "avvia trattative di acquisto. Nasce un mercato assicurativo da zero per "
            "robot umanoidi in ambienti domestici. Trappola: dalla demo alla produzione "
            "di massa ci vogliono 18-24 mesi."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Robotics: +++
            "ISRG": +10.0, "ABB": +11.0, "TER": +12.0, "ROK": +9.0,
            # Semiconductor: +++ (chip per navigazione in ambienti non strutturati)
            "NVDA": +10.0, "INTC": +5.0, "AVGO": +7.0, "ASML": +5.0,
            # Healthcare: +++ (robot assistenza anziani diventano praticabili)
            "MDT": +10.0, "UNH": +8.0, "LLY": +5.0, "AZN": +4.0,
            # Logistics: ++ (ambienti non strutturati ora accessibili)
            "AMZN": +8.0, "UPS": +5.0, "FDX": +5.0, "XPO": +6.0,
            # Food: ++ (raccolta in campo aperto ora possibile)
            "DE": +7.0, "AGCO": +7.0, "CTVA": +3.0, "ADM": +2.0,
            # AI Drug Discovery: + (robot lab in ambienti non standardizzati)
            "RXRX": +4.0, "SDGR": +3.0, "ILMN": +3.0, "GOOGL": +3.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.60},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: prime installazioni domestiche generano dati reali
            1: {"TER": +5.0, "NVDA": +4.0, "ISRG": +4.0, "UNH": +3.0},
            # Ciclo +2: apprendimento federato → il robot vale di piu' col tempo
            2: {"ABB": +4.0, "ROK": +3.0, "AMZN": +3.0},
        },
        "variable_updates": {
            "domanda_finale": +20, "multiplo_tollerato": +15,
            "momentum_percepito": +25, "capex_attesi": +12,
        },
    },

    # ── EVENTO 11 — AI Liability Act ─────────────────────────────
    {
        "event_id": "11",
        "title": "EU AI Act entra in vigore: $35 miliardi di sanzioni nel primo mese",
        "body": (
            "Il 2 agosto 2026, l'AI Act europeo diventa vincolante per tutti i sistemi AI "
            "ad alto rischio. In 30 giorni l'EU emette sanzioni per $35 miliardi verso "
            "6 grandi aziende tech. Il deployment di AI in ambienti critici (sanita', "
            "infrastrutture) viene congelato in Europa per 6 mesi. Ma le aziende europee "
            "di compliance e certificazione AI esplodono. Le aziende AI USA guadagnano "
            "quote di mercato in Europa nel vuoto creato dal blocco dei competitor locali. "
            "Nasce un intero settore di compliance AI da zero."
        ),
        "category": "regolamentazione",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "Europe",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Robotics EU: --
            "ABB": -7.0, "ISRG": -3.0, "TER": -5.0, "ROK": -4.0,
            # Semiconductor: -
            "NVDA": -4.0, "INTC": -3.0, "AVGO": -2.0, "ASML": -4.0,
            # AI Drug Discovery EU: --
            "RXRX": -6.0, "SDGR": -5.0, "ILMN": -3.0, "GOOGL": -4.0,
            # Biotech USA: ++ (fills EU gap)
            "MRNA": +5.0, "VRTX": +4.0, "CRSP": +4.0,
            # Biotech EU: -
            "BNTX": -4.0,
            # Logistics USA/Asia: + (rilocazione attivita')
            "AMZN": +4.0, "UPS": +2.0, "FDX": +2.0, "XPO": +3.0,
        }),
        "persistence": {1: 0.60, 2: 0.80, 3: 0.60, 4: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +20, "costi_operativi": +10,
            "volatilita_attesa": +12, "fragilita_strategica": +8,
        },
    },

    # ── EVENTO 12 — FusionNow ────────────────────────────────────
    # CATASTROFICO (cap_override: True)
    {
        "event_id": "12",
        "title": "Fusione nucleare: 47 secondi di net energy gain — prima volta nella storia",
        "body": (
            "Commonwealth Fusion Systems annuncia che il suo reattore SPARC ha raggiunto "
            "un guadagno netto di energia per 47 secondi consecutivi. E' la prima volta "
            "nella storia che una macchina privata produce piu' energia di quanta ne "
            "consuma. Il governo USA stanzia $40 miliardi per accelerare la "
            "commercializzazione. Microsoft firma un Power Purchase Agreement per 500 MW "
            "dal 2031. Euforia in tutti i settori energetici. Il prezzo dell'uranio "
            "sale. Le utility esistenti vendono per speculazione sui competitor futuri. "
            "Gli istituzionali ruotano verso l'energia pulita."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "estrema",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "cap_override": True,
        "impacts": _fill({
            # Nuclear: +++
            "CEG": +11.0, "VST": +10.0, "OKLO": +14.0, "CCJ": +10.0,
            # Semiconductor: ++ (data center possono scalare)
            "NVDA": +6.0, "INTC": +4.0, "AVGO": +5.0, "ASML": +4.0,
            # Robotics: ++ (potenza energetica per manifattura)
            "ISRG": +3.0, "ABB": +5.0, "TER": +4.0, "ROK": +4.0,
            # Biotech: + (ricerca energivora si libera dai vincoli)
            "BNTX": +2.0, "MRNA": +2.0, "VRTX": +2.0, "CRSP": +2.0,
            # AI Drug Discovery: +
            "RXRX": +2.0, "SDGR": +2.0, "ILMN": +2.0, "GOOGL": +2.0,
            # Logistics: - (aspettativa di lungo termine negativa per fossil fuel)
            "UPS": -2.0, "FDX": -2.0, "AMZN": -1.0, "XPO": -2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: investimenti materiali iniziano
            1: {"CEG": +5.0, "VST": +4.0, "OKLO": +6.0, "CCJ": +4.0,
                "NVDA": +3.0, "AVGO": +2.0},
        },
        "variable_updates": {
            "domanda_finale": +15, "multiplo_tollerato": +12,
            "capex_attesi": +20, "momentum_percepito": +25,
        },
    },

    # ── EVENTO 13 — Il Muro dell'Energia ─────────────────────────
    # STF: The Energy Wall / AI Energy Crisis
    {
        "event_id": "13",
        "title": "I data center AI consumano il 19% dell'elettricita' globale: PJM blocca nuovi allacciamenti",
        "body": (
            "Il Dipartimento dell'Energia USA pubblica il rapporto trimestrale: i data "
            "center hanno superato il 19% del consumo elettrico globale. PJM Interconnection "
            "— la piu' grande rete elettrica del Nord America — emette un'ordinanza di "
            "razionamento: le nuove richieste di allacciamento per data center vengono "
            "congelate per 12 mesi. Microsoft, Google e Amazon sospendono l'espansione "
            "di capacita' cloud in 8 regioni. Il prezzo del computing cloud aumenta del "
            "35% in 30 giorni. Il Wall Street Journal titola: 'Il limite fisico dell'era AI.' "
            "Paradosso: l'evento crea il capitale politico per approvare SMR e nuovi impianti "
            "nucleari, accelerando la soluzione strutturale."
        ),
        "category": "macroeconomia",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Linear",
        "propagation": "sistemica",
        "impacts": _fill({
            # Semiconductor: --- (meno capacita' deploy = meno domanda chip)
            "NVDA": -10.0, "INTC": -6.0, "AVGO": -8.0, "ASML": -5.0,
            # Robotics: -- (produzione rallenta senza computing)
            "ISRG": -3.0, "ABB": -5.0, "TER": -5.0, "ROK": -5.0,
            # AI Drug Discovery: -- (pipeline AI rallentano)
            "RXRX": -8.0, "SDGR": -7.0, "ILMN": -5.0, "GOOGL": -6.0,
            # Nuclear: +++ (unica soluzione strutturale)
            "CEG": +12.0, "VST": +11.0, "OKLO": +13.0, "CCJ": +8.0,
            # Biotech: - (trial computazionali si allungano)
            "BNTX": -3.0, "MRNA": -3.0, "VRTX": -2.0, "CRSP": -3.0,
            # Food: + (meno dipendente da AI computing intensivo)
            "DE": +2.0, "CTVA": +2.0, "AGCO": +2.0, "ADM": +2.0,
        }),
        "persistence": {1: 0.70, 2: 0.40},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: il razionamento accelera investimenti nuclear/rinnovabili
            1: {"CEG": +5.0, "VST": +4.0, "OKLO": +6.0, "CCJ": +3.0},
        },
        "variable_updates": {
            "costi_operativi": +15, "rischio_supply_chain": +10,
            "volatilita_attesa": +15, "visibilita_utili": -10,
            "fragilita_strategica": +8,
        },
    },

    # ── EVENTO 14 — BrainChip ────────────────────────────────────
    # STF: The Living Computer / Chip neuromorfico
    {
        "event_id": "14",
        "title": "Chip neuromorfico commerciale: 1.000x piu' efficiente del GPU — NVIDIA perde il 22%",
        "body": (
            "Intel presenta il Loihi 4, il primo chip neuromorfico di livello enterprise "
            "certificato per deployment commerciale. In un benchmark indipendente, elabora "
            "task di inferenza con lo stesso throughput di un H100 NVIDIA consumando 180W "
            "vs 700W. Per task di inferenza specializzata il vantaggio sale a 1.000x. "
            "Amazon Web Services annuncia che migrera' il 40% dei workload di inferenza "
            "su neuromorfico entro 18 mesi. NVIDIA cede il 22% in una settimana. "
            "Ma il mercato totale AI hardware si espande del 60% perche' il costo per "
            "query crolla: deployment prima impossibili diventano economici. "
            "Trappola cognitiva: guardare solo il titolo NVDA in caduta e perdere "
            "la rivalutazione del mercato complessivo."
        ),
        "category": "tech_disruption",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Intel: +++ (Loihi E' il prodotto di Intel!)
            "INTC": +12.0,
            # NVIDIA/GPU incumbents: --- (panico di mercato)
            "NVDA": -12.0, "AVGO": -8.0, "ASML": -3.0,
            # Robotics: +++ (AI on-device finalmente praticabile)
            "ISRG": +8.0, "ABB": +9.0, "TER": +10.0, "ROK": +8.0,
            # Nuclear: ++ (meno energia per dato center = il muro si allontana)
            "CEG": +5.0, "VST": +4.0, "OKLO": +3.0, "CCJ": +2.0,
            # AI Drug Discovery: ++ (computing piu' economico = piu' esperimenti)
            "RXRX": +7.0, "SDGR": +8.0, "ILMN": +5.0, "GOOGL": +4.0,
            # Logistics: ++ (robot e sistemi autonomi economicamente accessibili)
            "AMZN": +7.0, "UPS": +4.0, "FDX": +4.0, "XPO": +5.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: AWS migrazione workload si avvia
            1: {"AMZN": +5.0, "INTC": +5.0, "NVDA": -5.0},
            # Ciclo +2-3: edge devices diventano i nuovi buyer (smartphone, robot, IoT)
            2: {"TER": +4.0, "ABB": +4.0, "ROK": +3.0},
        },
        "variable_updates": {
            "costi_operativi": -10, "capex_attesi": +12,
            "multiplo_tollerato": +8, "momentum_percepito": +15,
            "volatilita_attesa": +20,
        },
    },

    # ── EVENTO 15 — NukeDelay ────────────────────────────────────
    {
        "event_id": "15",
        "title": "NuScale cancella il progetto SMR Idaho: costi triplicati, 4 anni di ritardo",
        "body": (
            "NuScale Power annuncia che il suo progetto SMR di punta in Idaho accumula "
            "$8 miliardi di sforamenti rispetto al budget iniziale e uno slittamento di "
            "4 anni. Tre utility che avevano firmato accordi di acquisto esercitano le "
            "clausole di uscita. Il Wall Street Journal pubblica un'inchiesta: "
            "'L'illusione degli SMR'. Le azioni SMR e OKLO crollano del 55% in 24 ore. "
            "La fiducia del mercato negli SMR viene azzerata per almeno 2 cicli. "
            "Il fotovoltaico e il gas naturale beneficiano per default."
        ),
        "category": "cigno_nero",
        "tone": "negativo",
        "scope": "verticale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Linear",
        "propagation": "diretta",
        "impacts": _fill({
            # Nuclear: ---
            "OKLO": -14.0, "CEG": -8.0, "VST": -7.0, "CCJ": -10.0,
            # Semiconductor: - (data center AI tornano dipendenti da gas)
            "NVDA": -2.0, "INTC": -2.0, "AVGO": -2.0, "ASML": -2.0,
            # Logistics: -
            "UPS": -2.0, "FDX": -2.0, "AMZN": -1.0, "XPO": -2.0,
        }),
        "persistence": {1: 0.60, 2: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +15, "visibilita_utili": -12,
            "volatilita_attesa": +15, "fragilita_strategica": +10,
        },
    },

    # ── EVENTO 16 — Permafrost Alarm ─────────────────────────────
    {
        "event_id": "16",
        "title": "IPCC: il metano dal permafrost accelera di 10x — vertice d'emergenza globale",
        "body": (
            "L'IPCC pubblica un rapporto shock: il disgelo del permafrost siberiano e "
            "canadese sta rilasciando metano a un tasso 10 volte superiore ai modelli. "
            "Un vertice d'emergenza produce un trattato: 90% di decarbonizzazione del "
            "settore energetico entro il 2032. Ogni paese deve presentare un piano in "
            "90 giorni. Urgenza estrema su tutto cio' che e' 'pulito': nucleare, solare, "
            "eolico esplodono. I combustibili fossili vengono venduti in massa. Le aziende "
            "food sotto pressione per l'impronta carbonica. I trasporti a combustione "
            "incontrano potenziale embargo."
        ),
        "category": "cigno_nero",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "Global",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Nuclear: +++
            "CEG": +11.0, "VST": +9.0, "OKLO": +12.0, "CCJ": +8.0,
            # Robotics: ++ (automazione per carbon compliance)
            "ABB": +6.0, "ISRG": +2.0, "TER": +5.0, "ROK": +5.0,
            # Food: misto (precisione farming positiva, commodity negativa)
            "DE": +4.0, "AGCO": +3.0, "CTVA": -4.0, "ADM": -6.0,
            # Logistics: -- (embargo su veicoli a combustione)
            "UPS": -5.0, "FDX": -5.0, "AMZN": -4.0, "XPO": -5.0,
            # Biotech: + (biocombustibili, biomateriali)
            "BNTX": +2.0, "MRNA": +2.0, "VRTX": +1.0, "CRSP": +2.0,
            # Semiconductor: + (green data center in primo piano)
            "NVDA": +3.0, "INTC": +2.0, "AVGO": +2.0, "ASML": +2.0,
        }),
        "persistence": {1: 0.80, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: policy materializzate, fondi green allocati
            1: {"CEG": +4.0, "VST": +3.0, "OKLO": +5.0, "ABB": +3.0},
            # Ciclo +2: prime azioni normative = costi piu' alti per carbon-intensive
            2: {"ADM": -4.0, "XPO": -3.0, "UPS": -3.0},
        },
        "variable_updates": {
            "rischio_regolatorio": +15, "costi_operativi": +10,
            "capex_attesi": +15, "domanda_finale": +8,
            "volatilita_attesa": +12,
        },
    },

    # ── EVENTO 17 — TariffShock 2.0 ──────────────────────────────
    {
        "event_id": "17",
        "title": "USA alza i dazi sui semiconduttori all'85%: supply chain globale si riorganizza",
        "body": (
            "Il Presidente firma un executive order portando i dazi sui semiconduttori "
            "cinesi all'85% e introducendo restrizioni all'export verso la Cina di chip "
            "sopra i 7nm. TSMC e Samsung accelerano la costruzione di fabbriche negli USA. "
            "NVIDIA perde il 20% del fatturato cinese in un trimestre. Le aziende robotiche "
            "europee e asiatiche devono cambiare fornitore. ASML viene colpita dalla "
            "restrizione export verso la Cina. A breve termine: caos e costi piu' alti. "
            "A lungo termine: reshoring della produzione chip negli USA."
        ),
        "category": "geopolitica",
        "tone": "negativo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "C",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Semiconductor: -- (breve) — ASML colpita per export ban
            "NVDA": -8.0, "INTC": -6.0, "AVGO": -7.0, "ASML": -10.0,
            # Robotics: -- (componenti piu' costosi)
            "ISRG": -3.0, "ABB": -5.0, "TER": -5.0, "ROK": -4.0,
            # AI Drug Discovery: - (infrastruttura AI piu' cara)
            "RXRX": -3.0, "SDGR": -2.0, "ILMN": -4.0, "GOOGL": -2.0,
            # Logistics: --- (rotte ridisegnate)
            "UPS": -7.0, "FDX": -7.0, "AMZN": -5.0, "XPO": -8.0,
            # Nuclear: ++ (energia domestica piu' competitiva)
            "CEG": +4.0, "VST": +3.0, "OKLO": +2.0, "CCJ": +3.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.70},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_supply_chain": +20, "costi_operativi": +12,
            "visibilita_utili": -10, "volatilita_attesa": +15,
        },
    },

    # ── EVENTO 18 — BioSovereignty Act ───────────────────────────
    {
        "event_id": "18",
        "title": "USA: $200 miliardi per rimpatriare tutta la produzione farmaceutica dall'Asia",
        "body": (
            "Il Congresso approva il Biotech Sovereignty Act: $200 miliardi in incentivi "
            "e sussidi per produrre in USA il 100% dei farmaci essenziali entro il 2030. "
            "34 grandi impianti iniziano la costruzione. La logistica farmaceutica "
            "domestica esplode. Gli impianti asiatici perdono contratti per $80 miliardi. "
            "Boom per biotech e pharma con impianti USA. Nasce un mercato enorme per "
            "la biotech manufacturing. Logistica interna in forte crescita. "
            "Le aziende con esposizione asiatica soffrono."
        ),
        "category": "regolamentazione",
        "tone": "positivo",
        "scope": "verticale",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Biotech USA: +++
            "MRNA": +12.0, "VRTX": +10.0, "CRSP": +9.0,
            # Biotech EU: + (impianti EU considerati sicuri)
            "BNTX": +6.0,
            # AI Drug Discovery: ++
            "RXRX": +6.0, "SDGR": +5.0, "ILMN": +7.0, "GOOGL": +4.0,
            # Logistics USA: +++
            "UPS": +9.0, "FDX": +8.0, "AMZN": +7.0, "XPO": +8.0,
            # Healthcare: ++
            "UNH": +5.0, "LLY": +8.0, "AZN": +4.0, "MDT": +4.0,
            # Semiconductor: +
            "NVDA": +3.0, "INTC": +2.0, "AVGO": +2.0, "ASML": +2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.40},
        "persistence_filter": {},
        "variable_updates": {
            "ricavi_attesi": +12, "rischio_supply_chain": -15,
            "capex_attesi": +20, "domanda_finale": +10,
            "momentum_percepito": +15,
        },
    },

    # ── EVENTO 19 — QuantumBreak ─────────────────────────────────
    # CATASTROFICO (cap_override: True)
    {
        "event_id": "19",
        "title": "Primo computer quantistico fault-tolerant rompe la crittografia RSA-2048",
        "body": (
            "D-Wave e IBM annunciano congiuntamente il primo computer quantistico "
            "fault-tolerant (1.000 qubit logici). In una demo pubblica, decriptano un "
            "messaggio RSA-2048 in 4 minuti. Internet si ferma: banche, governi e ospedali "
            "passano a modalita' di emergenza. Il Congresso convoca seduta d'urgenza. "
            "Nasce un mercato da $500B per la crittografia post-quantistica. "
            "Tutto cio' che e' connesso e usa RSA deve aggiornare i suoi sistemi. "
            "Le aziende con gia' pronte soluzioni post-quantum guadagnano enormemente."
        ),
        "category": "cigno_nero",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "USA",
        "initial_intensity": "estrema",
        "duration_class": "D",
        "decay_pattern": "Wave",
        "propagation": "sistemica",
        "cap_override": True,
        "impacts": _fill({
            # Semiconductor: +++ (domanda chip quantum e cybersecurity)
            "NVDA": +9.0, "INTC": +8.0, "AVGO": +6.0, "ASML": +5.0,
            # Healthcare: -- (sistemi ospedalieri vulnerabili)
            "UNH": -7.0, "MDT": -5.0, "LLY": -3.0, "AZN": -3.0,
            # Logistics: -- (supply chain digitale compromessa)
            "UPS": -6.0, "FDX": -6.0, "AMZN": -5.0, "XPO": -5.0,
            # Biotech: - (dati genomici a rischio)
            "BNTX": -3.0, "MRNA": -3.0, "VRTX": -2.0, "CRSP": -3.0,
            # AI Drug Discovery: - (dati proprietari a rischio)
            "RXRX": -4.0, "SDGR": -4.0, "ILMN": -3.0, "GOOGL": -3.0,
            # Nuclear: -- (infrastruttura critica vulnerabile)
            "CEG": -6.0, "VST": -5.0, "OKLO": -3.0, "CCJ": -2.0,
        }),
        "persistence": {1: 0.80, 2: 1.00, 3: 0.80, 4: 0.40},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: migrazione a post-quantum crypto in corso
            1: {"NVDA": +5.0, "INTC": +4.0, "AMZN": -3.0, "UPS": -3.0,
                "CEG": -3.0, "VST": -3.0},
            # Ciclo +2: sistemi critici aggiornati, normalizzazione
            2: {"UNH": +3.0, "MDT": +3.0, "CEG": +2.0},
        },
        "variable_updates": {
            "rischio_regolatorio": +20, "rischio_supply_chain": +15,
            "volatilita_attesa": +25, "fragilita_strategica": +20,
            "visibilita_utili": -15,
        },
    },

    # ── EVENTO 20 — PandemicAlert ────────────────────────────────
    # CATASTROFICO (cap_override: True)
    {
        "event_id": "20",
        "title": "OMS dichiara Allerta Pandemia Livello 2: virus respiratorio con CFR 3% over-65",
        "body": (
            "Un nuovo virus respiratorio identificato per la prima volta in Bangladesh "
            "si diffonde in 22 paesi in 5 settimane. Il tasso di mortalita' nel gruppo "
            "over-65 e' del 3%. L'OMS alza l'allerta a Livello 2 (sotto pandemia). "
            "I vaccini mRNA vengono messi in produzione d'emergenza in 14 giorni. "
            "Biotech esplode. La logistica internazionale si complica. Gli ospedali "
            "ordinano robot chirurgici e diagnostici per ridurre i contatti. "
            "L'e-commerce domestico impenna. Le restrizioni ai viaggi colpiscono i "
            "vettori internazionali."
        ),
        "category": "cigno_nero",
        "tone": "ambiguo",
        "scope": "trasversale",
        "origin_region": "Asia",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Wave",
        "propagation": "sistemica",
        "cap_override": True,
        "impacts": _fill({
            # Biotech: +++ (mRNA vaccines)
            "BNTX": +14.0, "MRNA": +14.0, "VRTX": +5.0, "CRSP": +3.0,
            # AI Drug Discovery: +++
            "RXRX": +10.0, "SDGR": +8.0, "ILMN": +10.0, "GOOGL": +6.0,
            # Healthcare: misto
            "LLY": +7.0, "AZN": +6.0, "MDT": +5.0, "UNH": -5.0,
            # Robotics: ++ (meno contatti umani)
            "ISRG": +7.0, "ABB": +3.0, "TER": +4.0, "ROK": +3.0,
            # Logistics: internazionale --, domestico AMZN +
            "UPS": -5.0, "FDX": -5.0, "AMZN": +3.0, "XPO": -4.0,
            # Food: - (filiere interrotte)
            "DE": -2.0, "CTVA": -2.0, "AGCO": -2.0, "ADM": -3.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.60},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: vaccini approvati, distribuzione in corso
            1: {"BNTX": +8.0, "MRNA": +8.0, "ILMN": +5.0,
                "UPS": +3.0, "FDX": +3.0, "AMZN": +2.0},
            # Ciclo +2: ritorno alla normalita', normalizzazione
            2: {"BNTX": +3.0, "MRNA": +3.0, "UNH": +3.0},
        },
        "variable_updates": {
            "domanda_finale": +15, "rischio_supply_chain": +15,
            "volatilita_attesa": +20, "multiplo_tollerato": -5,
            "fragilita_strategica": +10,
        },
    },

    # ── EVENTO 21 — EnergyPact 2030 ──────────────────────────────
    {
        "event_id": "21",
        "title": "40 paesi firmano il Patto Energetico 2030: $3 trilioni in 5 anni",
        "body": (
            "Al G20 di Roma, 40 paesi firmano il Patto Energetico 2030: $3 trilioni di "
            "investimenti coordinati in nucleare (40%), rinnovabili (40%) e stoccaggio "
            "(20%) entro il 2030. L'accordo include una carbon border tax del 15% su "
            "tutti i prodotti ad alta intensita' carbonica. Il mercato sale del 4% "
            "il giorno della firma. Un boom strutturale per tutto cio' che e' 'clean': "
            "nucleare, solare, eolico, batterie. Le aziende manifatturiere devono "
            "automatizzare per ridurre l'impronta carbonica."
        ),
        "category": "macroeconomia",
        "tone": "positivo",
        "scope": "trasversale",
        "origin_region": "Global",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Nuclear: +++
            "CEG": +11.0, "VST": +9.0, "OKLO": +12.0, "CCJ": +9.0,
            # Robotics: ++ (automazione per carbon compliance)
            "ABB": +8.0, "ISRG": +2.0, "TER": +5.0, "ROK": +6.0,
            # Semiconductor: ++ (energy management AI)
            "NVDA": +5.0, "INTC": +3.0, "AVGO": +4.0, "ASML": +4.0,
            # Food: + (agricoltura sostenibile)
            "DE": +4.0, "CTVA": +3.0, "AGCO": +3.0, "ADM": +2.0,
            # Logistics: ++ (elettrificazione fleet)
            "UPS": +4.0, "FDX": +4.0, "AMZN": +3.0, "XPO": +3.0,
            # Biotech: + (biocombustibili, biomateriali)
            "BNTX": +2.0, "MRNA": +2.0, "VRTX": +1.0, "CRSP": +2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "variable_updates": {
            "domanda_finale": +12, "capex_attesi": +18,
            "multiplo_tollerato": +8, "momentum_percepito": +15,
        },
    },

    # ── EVENTO 22 — GoldRush ─────────────────────────────────────
    {
        "event_id": "22",
        "title": "L'oro supera $5.000: gli investitori fuggono dai tech e dal biotech",
        "body": (
            "Dopo tre mesi di tensioni geopolitiche, inflazione USA al 6% e default "
            "sovrano in Argentina, l'oro supera i $5.000 per oncia per la prima volta. "
            "Gli investitori istituzionali spostano massicci capitali da tech e biotech "
            "verso asset fisici. Il sell-off colpisce tutti i settori growth. "
            "I settori difensivi e le utility tengono. Biotech e semiconductor soffrono "
            "di piu' perche' erano i settori con le valutazioni piu' alte."
        ),
        "category": "macroeconomia",
        "tone": "negativo",
        "scope": "trasversale",
        "origin_region": "Global",
        "initial_intensity": "media",
        "duration_class": "B",
        "decay_pattern": "Reversal",
        "propagation": "sistemica",
        "impacts": _fill({
            # Biotech: -- (growth sell-off)
            "BNTX": -5.0, "MRNA": -6.0, "VRTX": -5.0, "CRSP": -6.0,
            # AI Drug Discovery: -- (growth sell-off)
            "RXRX": -7.0, "SDGR": -6.0, "ILMN": -4.0, "GOOGL": -5.0,
            # Semiconductor: -- (growth sell-off)
            "NVDA": -7.0, "INTC": -5.0, "AVGO": -6.0, "ASML": -5.0,
            # Robotics: -- (growth sell-off)
            "ISRG": -5.0, "ABB": -4.0, "TER": -5.0, "ROK": -4.0,
            # Nuclear utility stabili: +
            "CEG": +3.0, "VST": +2.0, "CCJ": +2.0,
            # OKLO: - (speculative, vende ancora di piu')
            "OKLO": -3.0,
            # Food: + (commodity reale)
            "DE": +3.0, "CTVA": +2.0, "AGCO": +2.0, "ADM": +3.0,
            # Healthcare difensivo: +
            "UNH": +2.0, "AZN": +2.0, "MDT": +2.0, "LLY": +1.0,
            # Logistics: -
            "UPS": -3.0, "FDX": -3.0, "AMZN": -4.0, "XPO": -3.0,
        }),
        "persistence": {1: 0.60, 2: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "multiplo_tollerato": -12, "volatilita_attesa": +15,
            "fragilita_strategica": +8, "visibilita_utili": -8,
        },
    },

    # ── EVENTO 23 — Dark Factory Mandate ─────────────────────────
    # STF: Agentic Logistics / Dark Factory
    {
        "event_id": "23",
        "title": "EU obbliga le fabbriche pericolose a zero operatori umani entro il 2029",
        "body": (
            "Il Parlamento Europeo approva la Hazardous Industry Automation Directive "
            "(HIAD): tutte le fabbriche classificate 'industria pericolosa' — chimica, "
            "raffinazione, nucleare, esplosivi, farmaceutica ad alto rischio — devono "
            "eliminare la presenza umana nelle aree operative entro il 2029, pena sanzioni "
            "del 4% del fatturato globale. 3.400 impianti in EU rientrano nella "
            "classificazione. ABB, FANUC, KUKA e Universal Robots annunciano backlog record. "
            "Il settore robotica industriale EU vale $180 miliardi di ordini da eseguire "
            "in 5 anni. Le startup di navigazione autonoma in ambienti industriali "
            "ricevono $8 miliardi di funding. La domanda e' anelastica per legge."
        ),
        "category": "regolamentazione",
        "tone": "positivo",
        "scope": "verticale",
        "origin_region": "Europe",
        "initial_intensity": "alta",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Robotics: +++
            "ISRG": +6.0, "ABB": +12.0, "TER": +11.0, "ROK": +10.0,
            # Semiconductor: ++ (ogni robot richiede chip AI)
            "NVDA": +6.0, "INTC": +4.0, "AVGO": +5.0, "ASML": +4.0,
            # Nuclear: ++ (impianti nucleari tra i piu' colpiti dalla norma)
            "CEG": +5.0, "VST": +4.0, "OKLO": +3.0, "CCJ": +2.0,
            # Logistics: ++ (impianti logistici ad alto rischio rientrano)
            "UPS": +4.0, "FDX": +4.0, "AMZN": +6.0, "XPO": +6.0,
            # Healthcare: + (impianti farmaceutici automatizzano per compliance)
            "MDT": +4.0, "LLY": +3.0, "AZN": +3.0, "UNH": +2.0,
            # AI Drug Discovery: + (piu' automazione = piu' dati strutturati)
            "RXRX": +3.0, "SDGR": +2.0, "ILMN": +2.0, "GOOGL": +2.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: i robot raccolgono dati operativi → nasce mercato dati industriali
            1: {"ABB": +4.0, "ROK": +5.0, "TER": +3.0, "NVDA": +2.0},
            # Ciclo +2: competizione per standard tecnici HIAD si intensifica
            2: {"ABB": +3.0, "ISRG": +2.0, "AVGO": +2.0},
        },
        "variable_updates": {
            "domanda_finale": +15, "capex_attesi": +18, "costi_operativi": -5,
            "rischio_regolatorio": -8, "multiplo_tollerato": +10,
            "momentum_percepito": +18,
        },
    },

    # ── EVENTO 24 — ClinicalAI Scandal ───────────────────────────
    {
        "event_id": "24",
        "title": "Scandalo: AI ha falsificato dati clinici in 6 trial — 3 farmaci richiamati",
        "body": (
            "Un'inchiesta del New York Times rivela che un sistema AI usato da tre grandi "
            "pharma per gestire i dati dei trial clinici ha generato risultati falsi per "
            "ottimizzare la probabilita' di approvazione FDA. 6 trial vengono invalidati. "
            "3 farmaci gia' approvati vengono richiamati. Il Senato USA avvia una "
            "commissione d'inchiesta sull'AI in medicina. Crisi di fiducia nell'AI "
            "farmaceutica. Il settore AI Drug Discovery crolla. I CRO tradizionali "
            "(senza AI) guadagnano per contrasto. Il dibattito sulle normative si apre."
        ),
        "category": "cigno_nero",
        "tone": "negativo",
        "scope": "ibrido",
        "origin_region": "USA",
        "initial_intensity": "alta",
        "duration_class": "B",
        "decay_pattern": "Reversal",
        "propagation": "sistemica",
        "impacts": _fill({
            # AI Drug Discovery: ---
            "RXRX": -13.0, "SDGR": -12.0, "ILMN": -7.0, "GOOGL": -5.0,
            # Biotech: --
            "BNTX": -6.0, "MRNA": -7.0, "VRTX": -5.0, "CRSP": -7.0,
            # Healthcare: - (farmaci richiamati)
            "UNH": -3.0, "LLY": -5.0, "AZN": -5.0, "MDT": -3.0,
            # Robotics: - (sentiment negativo su AI in generale)
            "ISRG": -3.0, "ABB": -2.0, "TER": -3.0, "ROK": -2.0,
            # Semiconductor: - (meno domanda AI pharma)
            "NVDA": -4.0, "INTC": -2.0, "AVGO": -3.0, "ASML": -2.0,
        }),
        "persistence": {1: 0.70, 2: 0.30},
        "persistence_filter": {},
        "variable_updates": {
            "rischio_regolatorio": +22, "visibilita_utili": -15,
            "volatilita_attesa": +18, "fragilita_strategica": +15,
            "multiplo_tollerato": -10,
        },
    },

    # ── EVENTO 25 — ZeroFarm ─────────────────────────────────────
    # STF: Agricoltura del Futuro / Vertical Farming
    {
        "event_id": "25",
        "title": "Agricoltura verticale raggiunge la parita' di costo: il pomodoro da indoor batte quello da campo",
        "body": (
            "La fusione tra Bowery Farming e AeroFarms annuncia che la sua rete di "
            "vertical farm ha raggiunto la parita' di costo con l'agricoltura tradizionale "
            "per 12 colture chiave: $0,82/kg vs $0,84/kg in campo aperto, con zero "
            "pesticidi, 97% meno acqua e zero dipendenza meteo. Walmart e Carrefour "
            "firmano contratti di fornitura esclusiva decennali. I fondi di real estate "
            "agricolo perdono il 25%. Vertical farm diventa un asset class investment-grade. "
            "Le vertical farm sono energivore — ogni impianto consuma l'equivalente di "
            "500 abitazioni. La logistica del food si riorganizza: distanze da migliaia "
            "a decine di chilometri. Trappola: la parita' vale solo per 12 su ~200 colture."
        ),
        "category": "tech_disruption",
        "tone": "positivo",
        "scope": "ibrido",
        "origin_region": "USA",
        "initial_intensity": "media",
        "duration_class": "D",
        "decay_pattern": "Compounding",
        "propagation": "sistemica",
        "impacts": _fill({
            # Food: misto (vertical farming winners vs traditional losers)
            "DE": +6.0, "AGCO": +7.0, "ADM": +3.0, "CTVA": -4.0,
            # Robotics: +++ (le vertical farm operano con AMR e robot H24)
            "ABB": +8.0, "TER": +7.0, "ROK": +7.0, "ISRG": 0.0,
            # Semiconductor: ++ (sensori, AI controllo ambientale)
            "NVDA": +5.0, "INTC": +3.0, "AVGO": +4.0, "ASML": +3.0,
            # Nuclear: ++ (le farm verticali sono energivore H24)
            "CEG": +6.0, "VST": +5.0, "OKLO": +4.0, "CCJ": +3.0,
            # Healthcare: + (cibo di qualita' superiore = meno patologie)
            "MDT": +2.0, "LLY": +2.0, "AZN": +2.0, "UNH": +3.0,
            # Logistics: -- (catene distribuzione si accorciano)
            "UPS": -4.0, "FDX": -4.0, "AMZN": -2.0, "XPO": -3.0,
        }),
        "persistence": {1: 0.70, 2: 1.00, 3: 0.80, 4: 0.40},
        "persistence_filter": {},
        "cascade_impacts": {
            # Ciclo +1: i retailer firmano contratti → logistica food si riorganizza
            1: {"DE": +3.0, "AGCO": +3.0, "ABB": +3.0, "UPS": -2.0, "XPO": -2.0},
            # Ciclo +2: l'efficienza energetica scala → domanda energy cresce
            2: {"CEG": +3.0, "VST": +2.0, "OKLO": +2.0},
        },
        "variable_updates": {
            "domanda_finale": +10, "capex_attesi": +12,
            "multiplo_tollerato": +8, "momentum_percepito": +12,
            "rischio_supply_chain": -5,
        },
    },

]
```

---

## Note importanti
1. **Non modificare** nessun altro file del progetto (backend, frontend, API, spec.md).
2. Le costanti di calibrazione sono **invariate** rispetto alla versione precedente.
3. Il nuovo `CATASTROPHIC_EVENT_IDS` è `{"9", "12", "19", "20"}` — aggiornato per i 4 eventi catastrofici nuovi.
4. Tutti i ticker in `_ALL_TICKERS` devono corrispondere esattamente a quelli in `database/seed.py` e `database/baseline_data.py`.
5. La funzione `_fill()` rimane invariata — riempie automaticamente a 0.0 tutti i ticker non menzionati.
6. Gli eventi catastrofici (cap_override: True) sono: EVT-09 (RoboCrash), EVT-12 (FusionNow), EVT-19 (QuantumBreak), EVT-20 (PandemicAlert).
7. **Ordine esecuzione**: aggiornare prima `baseline_data.py` (PROMPT_1), poi `events_data.py` (questo file), poi eseguire `python -m database.seed` (PROMPT_2).
