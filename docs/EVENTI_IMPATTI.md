# Portfolio Simulator — Documentazione Completa Eventi e Sistema di Impatti

> Documento tecnico-descrittivo esaustivo. Copre architettura, formule, parametri,
> ogni singolo evento con narrativa, logica economica, impatti numerici per ticker,
> persistenza, cascade, variabili interne e dinamiche di gioco.

---

# PARTE 1 — ARCHITETTURA DEL SISTEMA

## 1.1 Pipeline di calcolo prezzo (per ciclo)

Ogni ciclo di gioco esegue questa pipeline in sequenza:

```
1. apply_baseline_drift(cycle)    → drift strutturale per ogni titolo
2. generate_events_for_cycle(cycle) → seleziona 3 eventi, salva impatti
3. apply_impacts(cycle)           → applica drift + eventi + pending ai prezzi
4. save_portfolio_snapshots(cycle) → ricalcola valore portafogli
```

### Step 1 — Drift strutturale (drift/service.py)

Il drift rappresenta il movimento naturale del prezzo NON legato a eventi.

**Formula:**
```
drift = uniform(trend_low, trend_high) * intensity_mult * quality_mod * val_pressure
        + gauss(0, noise_std * beta)
```

**Componenti:**
| Componente | Fonte | Esempio |
|-----------|-------|---------|
| `trend_low, trend_high` | Settore → `TREND_DRIFT_RANGE` | Tech: `(+0.3, +1.5)` |
| `intensity_mult` | Settore → `INTENSITY_MULTIPLIER` | alta: `1.15` |
| `quality_mod` | Titolo → `QUALITY_DRIFT_MODIFIER` | leader_strutturale: `1.15` |
| `val_pressure` | Titolo → `VALUATION_PRESSURE` | altissima_aspettativa: `0.70` |
| `noise_std` | Settore → `VOLATILITY_NOISE` | alta: `1.2` |
| `beta` | Titolo → `STOCK_PROFILES` | NVDA: `2.38` |

**Esempio concreto — NVDA in un ciclo:**
```
base = uniform(0.3, 1.5) = 0.85
intensity = 1.15 (AI ha intensita alta)
quality = 1.10 (molto_positiva)
valuation = 0.70 (altissima_aspettativa, frena)
noise = gauss(0, 1.2 * 2.38) = gauss(0, 2.856) → es. -0.45

drift = 0.85 * 1.15 * 1.10 * 0.70 + (-0.45)
      = 0.753 + (-0.45)
      = +0.30%
```

### Step 2 — Selezione eventi (event_mgmt/service.py)

- Pool di **25 eventi** totali (19 regolari + 4 catastrofici + 1 anti-difensivi)
- Ogni ciclo: **3 eventi** selezionati casualmente senza ripetizione
- Gli eventi usati non tornano nel pool (25 eventi / 3 per ciclo = ~8 cicli massimi)

Per ogni evento selezionato:
1. Salva nel DB con 7 layer metadata
2. Salva `event_impacts` per ogni ticker con `delta_percent`
3. Crea `pending_impacts` per cicli futuri (persistenza per-evento)
4. Crea `cascade_impacts` per eventi catastrofici (effetti differiti addizionali)
5. Aggiorna `internal_variables` proporzionalmente all'impatto
6. Marca l'evento come usato

### Step 3 — Applicazione impatti (impact/service.py)

Per ogni titolo, la pipeline e':

**a. Raccolta impatti:**
- Impatti del ciclo corrente (da `event_impacts`)
- Impatti pendenti (da `pending_impacts` di cicli precedenti)
- Ogni impatto porta un flag `is_catastrophic`

**b. Ordinamento per |impatto| decrescente:**
L'impatto piu' grande ha priorita' (scala 100%).

**c. Single-event cap (per cap_class):**

| cap_class | Cap normale | Cap catastrofico |
|-----------|------------|-----------------|
| `large_cap` | ±12.0% | ±18.0% |
| `high_vol` | ±16.0% | ±24.0% |
| `defensive` | ±6.0% | ±9.0% |

**d. Multi-event scaling:**
```
1° evento (piu grande):  100%
2° evento:                70%
3° evento:                50%
4°+ evento:               30%
```

**Esempio:** Se AAPL ha impatti -8%, +5%, -3% in un ciclo:
```
Ordinato: |-8|, |+5|, |-3|
1°: -8.0 * 1.00 = -8.00
2°: +5.0 * 0.70 = +3.50
3°: -3.0 * 0.50 = -1.50
Totale eventi: -8.00 + 3.50 - 1.50 = -6.00%
```

**e. Anti-catastrofe / Anti-euforia:**

| Condizione | Compressione |
|-----------|-------------|
| 3+ eventi negativi (con catastrofico) | 8% |
| 3+ eventi negativi (senza catastrofico) | 17.5% |
| 3+ eventi positivi | 15% |

**f. Beta modulation:**
```
beta_factor = 0.70 + 0.30 * beta
```

| Titolo | Beta | Fattore | Effetto |
|--------|------|---------|---------|
| ARM | 4.13 | 1.94 | Quasi 2x amplificazione |
| NVDA | 2.38 | 1.41 | +41% amplificazione |
| TSLA | 1.97 | 1.29 | +29% amplificazione |
| AAPL | 1.12 | 1.04 | +4% amplificazione |
| JNJ | 0.33 | 0.80 | -20% smorzamento |
| KO | 0.33 | 0.80 | -20% smorzamento |
| LMT | 0.20 | 0.76 | -24% smorzamento |
| SHEL | -0.07 | 0.68 | -32% smorzamento |

**g. Somma drift + eventi:**
```
variazione_finale = (evento_total * beta_factor) + drift
```

**h. Calcolo prezzo:**
```
new_price = old_price * (1 + variazione_finale / 100)
new_price = max(new_price, 0.01)  # floor
```

### Step 4 — Aggiornamento fondamentali

Ogni fondamentale cambia in proporzione alla variazione di prezzo:

| Fondamentale | Ratio | Se prezzo +10%... |
|-------------|-------|-------------------|
| revenue | 0.50 | revenue +5% |
| ebitda | 0.60 | ebitda +6% |
| eps | 0.80 | eps +8% |
| roi | 0.40 | roi +4% |
| roe | 0.40 | roe +4% |
| target_price | 0.70 | target +7% |
| market_cap | 1.00 | market_cap +10% |
| pe_ratio | ricalcolato | `price / eps` |

---

## 1.2 Profili dei 61 titoli

### Classi di capitalizzazione

| Classe | Titoli | Cap normale | Cap catastrofico | Comportamento |
|--------|--------|------------|-----------------|---------------|
| **large_cap** (42) | AAPL, MSFT, GOOGL, TSM, CAT... | ±12% | ±18% | Moderato |
| **high_vol** (8) | NVDA, ARM, TSLA, BNTX, BGI, IFNNY, LI, BYDDY | ±16% | ±24% | Molto volatile |
| **defensive** (11) | JNJ, NVO, AZN, NVS, UNH, KO, PEP, MCD, NSRGY, DANOY, MDLZ, UL, LMT | ±6% | ±9% | Smorzato |

### Sensibilita' agli shock

| shock_sensitivity | Significato | Titoli esempio |
|-------------------|------------|----------------|
| 0.4 | Molto protetto | KO, NSRGY, DANOY, UL |
| 0.5 | Protetto | JNJ, PEP, MCD, MDLZ, AZN |
| 0.7 | Sotto media | LLY, DHR, AMGN, RACE, MC.PA, SAP |
| 1.0 | Neutro | CAT, XOM, CVX, TSM, AMZN |
| 1.1 | Sopra media | META, BABA, UPS, FDX |
| 1.2-1.3 | Sensibile | TSM, IFNNY, LI, NVDA |
| 1.4-1.5 | Molto sensibile | BNTX, BGI, ARM, TSLA |

---

## 1.3 Variabili interne (12 variabili per azienda)

Ogni azienda ha 12 variabili interne (default 50.0) che vengono aggiornate dagli eventi.
Queste variabili rappresentano lo "stato di salute" percepito dell'azienda.

| Variabile | Descrizione | Range |
|----------|-------------|-------|
| `ricavi_attesi` | Aspettative di fatturato | 0-100 |
| `margini_attesi` | Aspettative sui margini operativi | 0-100 |
| `costi_operativi` | Pressione sui costi | 0-100 (alto = negativo) |
| `capex_attesi` | Investimenti attesi | 0-100 |
| `rischio_supply_chain` | Rischio catena fornitura | 0-100 (alto = negativo) |
| `rischio_regolatorio` | Rischio normativo | 0-100 (alto = negativo) |
| `domanda_finale` | Forza della domanda | 0-100 |
| `visibilita_utili` | Prevedibilita' degli utili | 0-100 |
| `multiplo_tollerato` | Disponibilita' a pagare PE alti | 0-100 |
| `volatilita_attesa` | Volatilita' percepita | 0-100 (alto = negativo) |
| `momentum_percepito` | Sentiment di mercato | 0-100 |
| `fragilita_strategica` | Vulnerabilita' strutturale | 0-100 (alto = negativo) |

**Formula di aggiornamento:**
```
scale = abs(impact_pct) / 10.0
scaled_delta = variable_delta * scale
```

**Esempio:** Evento 21 (Malacca) su TSLA (-7%):
```
scale = |-7| / 10 = 0.70
rischio_supply_chain: +30 * 0.70 = +21.0 → da 50 a 71
costi_operativi:      +20 * 0.70 = +14.0 → da 50 a 64
visibilita_utili:     -15 * 0.70 = -10.5 → da 50 a 39.5
volatilita_attesa:    +25 * 0.70 = +17.5 → da 50 a 67.5
fragilita_strategica: +15 * 0.70 = +10.5 → da 50 a 60.5
```

---

## 1.4 Persistenza e Cascade

### Persistenza (tutti gli eventi)

L'impatto di un evento non si esaurisce al ciclo in cui avviene. Ogni evento ha un profilo di decadimento:

**Pattern disponibili:**
| Pattern | Curva | Uso tipico |
|---------|-------|-----------|
| **Spike** | `{1: 0.35, 2: 0.10}` | Shock rapido: cyber, attacco, blocco breve |
| **Reversal** | `{1: 0.60, 2: 0.30, 3: 0.10, 4: 0.05}` | Graduale normalizzazione: tassi, fiducia |
| **Compounding** | `{1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50}` | Effetto crescente: patti industriali, investimenti |
| **Lagged** | `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}` | Immediato poi cala: incentivi, reshoring |
| **Wave** | `{1: 0.80, 2: 0.60, 3: 0.40, 4: 0.30}` | Oscillante: regolamentazione, crisi |

**Implementazione:** Per ogni ticker impattato dall'evento, vengono create righe in `pending_impacts`:
```
Evento al ciclo N con persistence {1: 0.60, 2: 0.30}:
- pending_impact(target_cycle=N+1, pct=original_pct * 0.60)
- pending_impact(target_cycle=N+2, pct=original_pct * 0.30)
```

**Filtro persistenza:** Alcuni eventi hanno `persistence_filter` che limita la persistenza a ticker specifici.
Es. Evento 2 (Singapore): al ciclo +2 solo AAPL, AVGO, UPS, FDX, CAT, 0700.HK, FANUY, AMZN persistono.

### Cascade (solo eventi catastrofici 21-24)

I cascade sono impatti ADDIZIONALI separati dalla persistenza. Non sono un decay dell'impatto originale,
ma nuovi shock che si verificano nei cicli successivi come conseguenza dell'evento.

**Differenza chiave persistenza vs cascade:**
```
Persistenza: stesso impatto che decade
  Ciclo N:   TSLA -7.0%
  Ciclo N+1: TSLA -7.0% * 0.80 = -5.6% (lo stesso shock che perde forza)

Cascade: NUOVO impatto addizionale
  Ciclo N+1: TSLA -5.0% (nuovo: "le scorte componenti si esauriscono")

TOTALE ciclo N+1: -5.6% (persistenza) + -5.0% (cascade) = -10.6%
```

I cascade creano una narrativa temporale:
- Ciclo +1: primi effetti secondari (scorte esaurite, rotte alternative)
- Ciclo +2: PICCO DEL DANNO (produzione ferma, cascade completa)
- Ciclo +3: inizio recupero (rotte alternative operative, foundry sostitutive)

---

# PARTE 2 — CATALOGO COMPLETO EVENTI

---

## EVENTO 1 — Taglio tassi Fed 100 bps
**ID:** 1 | **Categoria:** macroeconomia | **Tono:** ambiguo | **Origine:** USA | **Intensita':** alta

### Narrativa
La Federal Reserve sorprende i mercati con un taglio aggressivo dei tassi di 100 punti base
in due riunioni consecutive. Il taglio rilancia la propensione al rischio ma segnala possibile
rallentamento macro. Non e' un regalo puro: i growth stocks beneficiano dai multipli piu' alti
tollerati, ma il messaggio implicito e' che l'economia sta rallentando.

### Logica economica dettagliata
- **Tech growth (+2% a +6%):** Tassi bassi → minore tasso di sconto sui flussi di cassa futuri → P/E tollerati piu' alti. MSFT (+6%) come leader cloud/AI beneficia di piu'. ARM (+5%) per multipli estremi. AAPL (+2%) meno growth-sensitiva.
- **Biotech/Med (+1% a +3%):** BNTX (+3%) e VRTX (+2%) per multipli. Pipeline di sviluppo finanziata meglio con tassi bassi.
- **Robotica (+2% a +5%):** ISRG (+5%) per capex ospedaliero finanziato piu' facilmente. SIEGY (+3%) per ordini industriali.
- **Energia (-1.5% a -3%):** XOM/CVX (-3%) perdono attrattivita' come yield play. I dividendi dell'energia competono con i bond: se i bond rendono meno, l'energia dovrebbe beneficiare, MA il taglio aggressivo segnala debolezza economica → meno domanda petrolio attesa.
- **Difensivi (-0.5% a -1%):** Rotazione risk-off → risk-on. JNJ/KO/PEP perdono flussi.
- **Auto (+1.5% a +4%):** TSLA (+4%) per finanziamenti auto piu' economici. LI (+3%) per credito consumer cinese.

### Impatti numerici completi
```
Tech:       MSFT +6.0  AMZN +5.0  META +4.0  GOOGL +2.0  AAPL +2.0  SAP +1.5  ASML +3.0  0700.HK +2.0  BABA +2.5
AI:         NVDA +3.0  ARM +5.0   AVGO +2.0  TSM +2.0    IFNNY +2.5  BIDU +2.0
Healthcare: JNJ -1.0   UNH -1.0   NVO -0.5   AZN -0.5    NVS -0.5    LLY +1.0
Biotech:    VRTX +2.0  BNTX +3.0  AMGN +1.0  DHR +2.0    GMAB +1.0   BGI +1.5
Med Pers:   A +1.0     IQV +2.0   WAT +1.0
Robot:      ISRG +5.0  SIEGY +3.0  ABBNY +2.5  BYDDY +2.0  FANUY +2.0
Industria:  CAT +3.0   HON +3.0    DE +3.0     GE +3.5     LMT -1.0
Logistica:  UPS +1.0   FDX +1.0    UNP +1.0
Energia:    XOM -3.0   CVX -3.0    SHEL -2.0   TTE -2.0    BP -2.0   E -1.5  0883.HK -1.5
Food:       KO -1.0    PEP -1.0    MCD -0.5    NSRGY -0.5  DANOY -0.5  MDLZ -0.5  UL -0.5
Auto:       TSLA +4.0  RACE +1.5   LI +3.0
Luxury:     MC.PA +2.0
```

### Persistenza
**Pattern:** Reversal — `{1: 0.60, 2: 0.30, 3: 0.10, 4: 0.05}`

Il mercato reagisce forte, poi normalizza lentamente. Al ciclo +4 l'effetto e' quasi zero.

**Esempio MSFT:**
| Ciclo | Persistenza | Impatto |
|-------|------------|---------|
| 0 | 100% | +6.0% |
| +1 | 60% | +3.6% |
| +2 | 30% | +1.8% |
| +3 | 10% | +0.6% |
| +4 | 5% | +0.3% |

### Variabili interne
```
multiplo_tollerato:  +8   (mercato accetta PE piu' alti)
domanda_finale:      +3   (lieve stimolo consumi)
volatilita_attesa:   +5   (incertezza su salute economia)
rischio_supply_chain: 0   (nessun impatto diretto)
```

---

## EVENTO 2 — Attacco informatico porto di Singapore (10 giorni)
**ID:** 2 | **Categoria:** cigno_nero | **Tono:** negativo | **Origine:** Asia | **Intensita':** alta

### Narrativa
Un attacco informatico coordinato paralizza il porto di Singapore — il secondo hub container
piu' grande al mondo — per dieci giorni. Il porto gestisce il 20% del traffico container globale
e il 25% del trasbordo mondiale di merci. L'evento ha effetti supply chain globali, soprattutto
su Asia, elettronica, trasporto container e produzione just-in-time.

### Logica economica dettagliata
- **Logistica epicentro (-10%):** UPS/FDX (-10%) perche' Singapore e' hub di smistamento per l'intero Sud-Est asiatico. UNP (+3%) come alternativa ferroviaria terrestre guadagna.
- **Tech hardware (-2% a -8%):** AAPL (-8%) perche' il 100% degli iPhone attraversa porti asiatici. AMZN (-5%) per e-commerce bloccato. MSFT (-2%) meno hardware-dipendente.
- **Semi (-4% a -6%):** TSM (-6%) wafer spediti via Singapore verso assemblatori. NVDA/AVGO (-5%) per backlog consegne.
- **China tech (-4% a -7%):** 0700.HK (-7%) perche' WeChat Pay/giochi dipendono da server con componenti spedite via Singapore. BABA (-6%) per e-commerce cross-border.
- **Robotica (-3% a -5%):** FANUY (-5%) headquarter in Giappone, hub di distribuzione a Singapore.
- **Difensivi safe haven (+1% a +2%):** Rotazione classica verso JNJ, UNH, KO, PEP.

### Impatti numerici completi
```
AI/Semi:    TSM -6.0    NVDA -5.0   ARM -4.0    AVGO -5.0   IFNNY -4.0
Tech:       AAPL -8.0   AMZN -5.0   META -2.0   MSFT -2.0   SAP -1.0   ASML -3.0
China:      0700.HK -7.0  BABA -6.0  BIDU -4.0
Logistica:  UPS -10.0   FDX -10.0   UNP +3.0
Industria:  CAT -5.0    HON -5.0    DE -4.0
Robot:      SIEGY -4.0  ABBNY -3.0  FANUY -5.0  BYDDY -4.0
Auto:       TSLA -3.0   LI -5.0
Healthcare: JNJ +2.0    UNH +2.0    NVO +1.0    AZN +1.0
Difesa:     LMT +1.0
Energia:    XOM +1.0
Food:       KO +1.0     PEP +1.0
```

### Persistenza
**Pattern:** Spike — `{1: 0.35, 2: 0.10}`

L'attacco si risolve rapidamente (10 giorni). Il backlog operativo residuo colpisce solo
i titoli con filiere asiatiche piu' lunghe.

**Filtro persistenza ciclo +2:** Solo AAPL, AVGO, UPS, FDX, CAT, 0700.HK, FANUY, AMZN
mantengono impatto residuo al ciclo +2. Gli altri recuperano completamente.

### Variabili interne
```
rischio_supply_chain: +20  (forte aumento rischio catena)
costi_operativi:      +8   (backlog = straordinari/overtime)
visibilita_utili:     -10  (impossibile prevedere recupero)
volatilita_attesa:    +15  (incertezza elevata)
```

---

## EVENTO 3 — Patto industriale Cina-Corea-Vietnam componentistica avanzata
**ID:** 3 | **Categoria:** geopolitica | **Tono:** positivo | **Origine:** Asia | **Intensita':** media

### Narrativa
Cina, Corea del Sud e Vietnam firmano un accordo industriale strategico sulla componentistica
avanzata. Il patto apre nuove filiere produttive e riduce i colli di bottiglia nella catena
dei semiconduttori e della robotica, creando nuove opportunita' per i produttori.

### Logica economica dettagliata
- **Semi (+3% a +7%):** TSM (+7%) per nuova domanda dal Vietnam. AVGO (+6%) per chip networking. ASML (+5%) per litografia richiesta dalle nuove fab.
- **Robotica (+3% a +5%):** FANUY (+5%) e SIEGY (+4%) per nuovi ordini automazione fabbriche vietnamite.
- **China tech (+2% a +4%):** 0700.HK (+4%) per integrazione digitale regionale. BABA (+3%) per e-commerce B2B.
- **Energia (-1%):** XOM/CVX (-1%) rotazione settoriale verso industriali.

### Impatti numerici completi
```
Semi:       TSM +7.0  AVGO +6.0  NVDA +5.0  ARM +4.0  IFNNY +4.0  ASML +5.0  BIDU +3.0
Robot:      SIEGY +4.0  ABBNY +3.0  FANUY +5.0  BYDDY +3.0
Tech:       MSFT +3.0  HON +3.0  CAT +2.0  DE +1.0
China:      0700.HK +4.0  BABA +3.0  LI +2.0
Energia:    XOM -1.0  CVX -1.0
Healthcare: JNJ -1.0
```

### Persistenza
**Pattern:** Compounding — `{1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50}`

L'effetto CRESCE nel tempo: le nuove filiere entrano a regime gradualmente.
Il picco e' al ciclo +2 (filiere operative), poi decade lentamente.

**Esempio TSM:**
| Ciclo | Fattore | Impatto |
|-------|---------|---------|
| 0 | 100% | +7.0% |
| +1 | 70% | +4.9% |
| +2 | **100%** | **+7.0%** (picco!) |
| +3 | 80% | +5.6% |
| +4 | 50% | +3.5% |

### Variabili interne
```
capex_attesi:           +10  (nuovi investimenti)
rischio_supply_chain:    -8  (diversificazione riduce rischio)
margini_attesi:          +4  (economie di scala)
momentum_percepito:     +12  (forte sentiment positivo)
```

---

## EVENTO 4 — Messico: maxi incentivi fabbriche high-tech
**ID:** 4 | **Categoria:** macroeconomia | **Tono:** positivo | **Origine:** Americas | **Intensita':** media

### Narrativa
Il governo messicano lancia un pacchetto di incentivi fiscali straordinari per attirare
fabbriche high-tech dal Pacifico asiatico. L'iniziativa favorisce il reshoring manifatturiero
in Nord America e stimola gli ordini di macchinari e automazione industriale.

### Logica economica dettagliata
- **Industria pesante (+4% a +6%):** CAT/HON (+6%) per macchinari movimento terra e costruzione. DE (+5%) per automazione agricola messicana. GE (+4%) per turbine e impiantistica.
- **Logistica (+2% a +5%):** UNP (+5%) rotte ferroviarie USA-Messico. FDX (+4%) per spedizioni cross-border.
- **Robotica (+3% a +4%):** SIEGY (+4%) per automazione fabbriche. FANUY/ABBNY (+3%) per robot assembly.
- **Taiwan (-2%):** TSM (-2%) per diversificazione dalla dipendenza asiatica — segnale negativo per il monopolio.

### Impatti numerici completi
```
Industria:  CAT +6.0  HON +6.0  DE +5.0   GE +4.0   UNP +5.0
Logistica:  FDX +4.0  UPS +2.0
Tech:       AAPL +3.0  MSFT +3.0  AMZN +2.0
Robot:      SIEGY +4.0  ABBNY +3.0  FANUY +3.0
Auto:       TSLA +3.0  LI +1.0  RACE +1.0
Semi:       TSM -2.0
China:      0700.HK -1.0  BABA -1.0
```

### Persistenza
**Pattern:** Lagged — `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}`

Impatto immediato per gli industriali (ordini anticipati), poi calo graduale man mano
che il mercato prezza l'informazione.

### Variabili interne
```
capex_attesi:          +12  (investimenti massivi)
domanda_finale:         +8  (nuova domanda manifatturiera)
rischio_supply_chain:   -6  (diversificazione geografica)
visibilita_utili:       +7  (ordini visibili a lungo termine)
```

---

## EVENTO 5 — UE: limiti energetici data center (Irlanda, Paesi Bassi)
**ID:** 5 | **Categoria:** regolamentazione | **Tono:** negativo | **Origine:** Europa | **Intensita':** media

### Narrativa
L'UE impone limiti severi al consumo energetico dei nuovi data center in Irlanda e Paesi Bassi.
La regolamentazione frena l'espansione AI in Europa e spinge i grandi operatori a riallocare
capacita' verso il Texas e altre giurisdizioni piu' permissive.

### Logica economica dettagliata
- **AI/Semi (-4% a -6%):** NVDA (-6%) meno GPU vendute in Europa. ARM/AVGO (-5%) per chip data center. MSFT (-4%) per Azure EU rallentato. SAP (-3%) colpita come azienda EU.
- **Energia beneficia (+2% a +4%):** XOM/SHEL/TTE (+4%) perche' la stretta energetica aumenta la consapevolezza del costo dell'energia. L'AI ha bisogno di piu' energia → piu' domanda fossile nel breve.
- **Industria (+2%):** HON/SIEGY (+2%) per soluzioni di efficienza energetica.

### Impatti numerici completi
```
AI/Semi:    NVDA -6.0  ARM -5.0  AVGO -5.0  IFNNY -4.0  MSFT -4.0  SAP -3.0  ASML -4.0  AMZN -3.0
Energia:    XOM +4.0   SHEL +4.0  TTE +4.0   CVX +3.0    BP +3.0    E +2.0
Industria:  HON +2.0   SIEGY +2.0
```

### Persistenza
**Pattern:** Wave — `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
capex_attesi:         -12  (investimenti EU frenati)
rischio_regolatorio:  +10  (precedente normativo)
domanda_finale:        +6  (riallocazione verso USA)
momentum_percepito:    -8  (sentiment negativo su AI EU)
```

---

## EVENTO 6 — Bruxelles: stretta AI generativa nei settori regolati
**ID:** 6 | **Categoria:** regolamentazione | **Tono:** negativo | **Origine:** Europa | **Intensita':** media-alta

### Narrativa
Bruxelles approva una stretta regolatoria improvvisa sull'uso commerciale dell'AI generativa
nei settori finanziari, sanitari e della pubblica amministrazione. Penalizza i nomi piu'
esposti a revenue AI in Europa ma premia chi ha compliance frameworks robusti.

### Logica economica dettagliata
- **Tech colpiti (-1% a -8%):** META/GOOGL (-8%) per ad-targeting AI limitato in settori regolati. NVDA/MSFT (-5%) per meno GPU/cloud venduti. ARM (-6%) per chip AI meno richiesti in EU.
- **Healthcare beneficia (+2% a +3%):** JNJ/AZN/NVS (+2-3%) perche' la stretta protegge il loro settore dalla disruption AI. IQV (+3%) per clinical trials che richiedono oversight umano.
- **SAP colpita (-4%):** Nonostante compliance robusta, il mercato punisce qualsiasi azienda tech EU.

### Impatti numerici completi
```
Tech:       META -8.0  GOOGL -8.0  NVDA -5.0  MSFT -5.0  ARM -6.0  SAP -4.0  ASML -3.0  AMZN -3.0
China:      BIDU -2.0  0700.HK -1.0
Healthcare: JNJ +3.0   AZN +3.0  NVS +2.0  IQV +3.0  UNH +2.0  NVO +2.0
Food:       KO +1.0    NSRGY +1.0
```

### Persistenza: `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
rischio_regolatorio:   +18  (forte precedente normativo)
multiplo_tollerato:    -10  (mercato sconta rischio regolatorio)
visibilita_utili:       -8  (incertezza su revenue AI EU)
momentum_percepito:     -5  (sentiment negativo)
```

---

## EVENTO 7 — Mar Rosso normalizzato: premi assicurativi crollano
**ID:** 7 | **Categoria:** geopolitica | **Tono:** positivo | **Origine:** Middle East | **Intensita':** media

### Narrativa
Il traffico commerciale nel Mar Rosso si normalizza dopo mesi di tensione (attacchi Houthi).
I premi assicurativi sul trasporto container crollano, riducendo i costi logistici globali.

### Logica economica dettagliata
- **Logistica (+7%):** UPS/FDX (+7%) per calo drastico costi spedizione.
- **Hardware/Industria (+3% a +5%):** AAPL/CAT/HON (+5%) per supply chain piu' efficiente. TSM/NVDA/AVGO (+3-4%) per lead time ridotti.
- **Energia (-1.5% a -2%):** XOM/CVX/SHEL/TTE (-2%) perche' il premio geopolitico sul petrolio cala. Il Brent perde $5-8 in pochi giorni.
- **Food (+1% a +2%):** NSRGY/DANOY (+2%) per costi import materie prime in calo.

### Impatti numerici completi
```
Logistica:  UPS +7.0  FDX +7.0  UNP +2.0
Tech/Ind:   AAPL +5.0  CAT +5.0  HON +5.0  DE +4.0  GE +3.0
Semi:       TSM +4.0  NVDA +3.0  AVGO +3.0  ASML +3.0
Tech:       META +2.0  AMZN +3.0  SAP +1.0
Robot:      SIEGY +2.0  ABBNY +2.0  FANUY +2.0
Auto:       TSLA +2.0  RACE +1.0
Luxury:     MC.PA +2.0
Energia:    XOM -2.0  CVX -2.0  SHEL -2.0  TTE -2.0  BP -1.5  E -1.0
```

### Persistenza: `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
costi_operativi:       -10  (costi logistici giu')
rischio_supply_chain:   -8  (rotte sicure)
margini_attesi:         +4  (meno costi = margini piu' alti)
volatilita_attesa:      -8  (meno incertezza)
```

---

## EVENTO 8 — Cile: blocco export rame raffinato (6 mesi)
**ID:** 8 | **Categoria:** geopolitica | **Tono:** negativo | **Origine:** Americas | **Intensita':** alta

### Narrativa
Il Cile (primo produttore mondiale di rame) blocca l'export di rame raffinato per 6 mesi
per sostenere la filiera industriale interna. Il rame e' essenziale per semiconduttori,
cavi elettrici, motori EV, costruzioni e infrastrutture.

### Logica economica dettagliata
- **Industria devastata (-6% a -10%):** CAT (-10%) per macchinari edili che usano tonnellate di rame. HON (-9%) per cablaggi industriali. DE (-8%) per elettrificazione agricola.
- **Semi (-5% a -7%):** NVDA/AVGO/TSM (-7%) perche' i substrati dei chip usano rame per le interconnessioni. ASML (-5%) per componenti.
- **Robotica (-4% a -6%):** SIEGY (-6%) motori e cablaggi. FANUY/BYDDY (-4%) per componenti elettrici.
- **EV (-3% a -5%):** TSLA (-5%) per cavi/motori. LI (-3%) componenti.
- **Healthcare safe haven (+1% a +3%):** JNJ (+3%), UNH (+2%) rotazione difensiva.

### Impatti numerici completi
```
Industria:  CAT -10.0  HON -9.0  DE -8.0  GE -6.0
Semi:       NVDA -7.0  AVGO -7.0  TSM -7.0  ARM -5.0  IFNNY -6.0  ASML -5.0  MSFT -3.0
Robot:      SIEGY -6.0  ABBNY -5.0  FANUY -4.0  BYDDY -4.0
Auto:       TSLA -5.0  LI -3.0
Healthcare: JNJ +3.0  UNH +2.0  NVO +2.0  AZN +2.0
Biotech:    AMGN +2.0  GMAB +1.0  BGI +1.0
Food:       KO +1.5  PEP +1.5
```

### Persistenza: `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
costi_operativi:     +12  (rame +40% spot)
margini_attesi:       -6  (costi mangiano margini)
volatilita_attesa:   +15  (incertezza durata blocco)
capex_attesi:         -4  (investimenti posticipati)
```

---

## EVENTO 9 — Accelerazione automazione robotica Germania/Francia
**ID:** 9 | **Categoria:** tech_disruption | **Tono:** positivo | **Origine:** Europa | **Intensita':** media-alta

### Narrativa
Le grandi fabbriche tedesche e francesi anticipano di tre anni i piani di automazione robotica.
Ordini record per robot industriali, visione artificiale e semiconduttori per automazione.

### Logica economica dettagliata
- **Robotica epicentro (+5% a +10%):** SIEGY (+10%) leader europeo automazione. ABBNY (+9%) per robot ABB. FANUY (+8%) per robot FANUC. ISRG (+7%) beneficio indiretto su robot chirurgici (tecnologia correlata).
- **Semi (+3% a +4%):** NVDA (+4%) per chip di controllo (GPU edge). ARM (+3%) per architettura chip embedded. IFNNY (+4%) per microcontrollori industriali.
- **Industria (+4% a +5%):** HON (+5%) per sistemi di controllo. CAT (+4%) per integrazione.

### Impatti numerici completi
```
Robot:      SIEGY +10.0  ABBNY +9.0  FANUY +8.0  BYDDY +5.0  ISRG +7.0
Industria:  HON +5.0  CAT +4.0
Semi:       NVDA +4.0  TSM +3.0  AVGO +3.0  ARM +3.0  IFNNY +4.0  ASML +4.0
Tech:       SAP +2.0
Auto:       RACE +2.0
Logistica:  UPS -1.0  FDX -1.0
Healthcare: JNJ -1.0
```

### Persistenza
**Pattern:** Compounding — `{1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50}`
Ordini iniziano ora, consegne e ricavi crescono nel tempo. Picco al ciclo +2.

### Variabili interne
```
domanda_finale:       +15  (boom ordini robotica)
capex_attesi:          +9  (investimenti automazione)
momentum_percepito:   +14  (forte trend positivo)
margini_attesi:        +6  (automazione riduce costi lavoro)
```

---

## EVENTO 10 — Fiducia consumatori USA crolla 3 trimestri
**ID:** 10 | **Categoria:** macroeconomia | **Tono:** negativo | **Origine:** USA | **Intensita':** alta

### Narrativa
L'indice di fiducia dei consumatori americani crolla per il terzo trimestre consecutivo,
ai minimi dal 2009. Spesa consumer discrezionale in forte calo, recessione tecnica probabile.

### Logica economica dettagliata
- **Tech consumer (-2% a -7%):** AAPL/META (-7%) per crollo vendite iPhone e ad spending. GOOGL (-6%) meno search ads. AMZN (-5%) meno e-commerce.
- **Auto (-2% a -6%):** TSLA (-6%) per crollo vendite auto. RACE (-2%) per lusso meno esposto.
- **Difensivi beneficiano (+1.5% a +4%):** KO/PEP (+3%), MCD (+2%), JNJ/UNH (+4%). Rotazione classica verso defensive value.
- **Energia (+1% a +2%):** XOM (+2%) come value play con dividendo.
- **Lusso (-4%):** MC.PA (-4%) per turismo e spesa discrezionale in calo.

### Impatti numerici completi
```
Tech:       AAPL -7.0  META -7.0  GOOGL -6.0  AMZN -5.0  MSFT -2.0
Logistica:  UPS -5.0  FDX -5.0  DE -4.0
Industria:  CAT -3.0  HON -3.0
Auto:       TSLA -6.0  LI -3.0  RACE -2.0
Luxury:     MC.PA -4.0
Healthcare: JNJ +4.0  UNH +4.0  NVO +3.0  AZN +2.0  NVS +2.0
Difesa:     LMT +3.0
Energia:    XOM +2.0  CVX +1.0
Food:       KO +3.0  PEP +3.0  MCD +2.0  NSRGY +2.0  DANOY +1.5  MDLZ +2.0  UL +1.5
```

### Persistenza
**Pattern:** Lagged — `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}`

### Variabili interne
```
domanda_finale:       -12  (crollo spesa consumer)
visibilita_utili:      -8  (impossibile prevedere recupero)
momentum_percepito:   -10  (sentiment pessimista)
volatilita_attesa:     +8  (incertezza macro)
```

---

## EVENTO 11 — Cyberattacco pagamenti e logistica Nord America (5 giorni)
**ID:** 11 | **Categoria:** cigno_nero | **Tono:** negativo | **Origine:** USA | **Intensita':** ESTREMA

### Narrativa
Un attacco ransomware coordinato paralizza 3 dei 5 principali processori di pagamento
e i sistemi informatici di FedEx e UPS per 5 giorni. L'e-commerce si ferma,
le consegne sono bloccate, le transazioni online impossibili.

### Logica economica dettagliata
- **Logistica/Pagamenti (-10% a -12%):** UPS/FDX (-12%) sistemi down. UNP (-10%) collegata al sistema logistico.
- **E-commerce/Ad (-6% a -9%):** AMZN (-9%) e-commerce paralizzato. AAPL/META (-8%) per transazioni App Store/Instagram Shopping bloccate. GOOGL (-7%) meno transazioni = meno ad clicks.
- **Industria (-4% a -5%):** CAT/HON (-5%) per pagamenti B2B bloccati.
- **Safe haven (+2% a +4%):** JNJ (+4%), LMT (+3%), KO/PEP (+2%). Rotazione fulminea verso difensivi.

### Impatti numerici completi
```
Logistica:  UPS -12.0  FDX -12.0  UNP -10.0
Tech:       AAPL -8.0  META -8.0  GOOGL -7.0  AMZN -9.0  MSFT -6.0  SAP -3.0
Industria:  CAT -5.0  HON -5.0  DE -4.0
Semi:       NVDA -4.0  AVGO -4.0  ARM -3.0
Auto:       TSLA -5.0
Food:       MCD -3.0
Luxury:     MC.PA -3.0
Healthcare: JNJ +4.0  NVO +3.0  UNH +3.0  AZN +2.0
Difesa:     LMT +3.0
Energia:    XOM +2.0
Food+:      KO +2.0  PEP +2.0  NSRGY +1.5
```

### Persistenza
**Pattern:** Spike brevissimo — `{1: 0.25}`

Solo 1 ciclo di decay, con filtro: solo UPS, FDX, UNP, AAPL, META, AMZN, CAT persistono.
I sistemi tornano online in 5 giorni — impatto psicologico breve.

### Variabili interne
```
rischio_supply_chain:  +18  (vulnerabilita' cyber rivelata)
visibilita_utili:      -12  (trimestre compromesso)
volatilita_attesa:     +20  (panico di mercato)
fragilita_strategica:  +10  (dipendenza da infrastruttura digitale)
```

---

## EVENTO 13 — Siccita' estrema: Canale di Panama -40%
**ID:** 13 | **Categoria:** crisi_ambientale | **Tono:** negativo | **Origine:** Americas | **Intensita':** media-alta

### Narrativa
Siccita' senza precedenti riduce del 40% la capacita' di transito merci nel Canale di Panama.
Le navi devono circumnavigare il Sud America (+15 giorni di transito).

### Logica economica dettagliata
- **Logistica (-9%):** UPS/FDX (-9%) per rotte allungate e costi carburante.
- **Supply chain (-4% a -6%):** AAPL/CAT (-6%) per ritardi materie prime. TSM (-5%) per rotte alternative.
- **Ferrovia beneficia (+4%):** UNP (+4%) come alternativa terrestre.
- **Energia (+2% a +3%):** XOM/CVX per costi trasporto LNG in aumento.

### Impatti numerici completi
```
Logistica:  UPS -9.0  FDX -9.0  UNP +4.0
Tech/Ind:   AAPL -6.0  CAT -6.0  DE -5.0  HON -5.0  TSM -5.0
Semi:       NVDA -3.0  AVGO -3.0  AMZN -4.0  META -2.0  ASML -2.0
Auto:       TSLA -3.0  LI -2.0
Food:       NSRGY -1.0  UL -1.0
Healthcare: JNJ +2.0  NVO +1.0  KO +1.0  PEP +1.0
```

### Persistenza: `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
costi_operativi:       +10  (rotte piu' costose)
visibilita_utili:       -7  (tempi incerti)
rischio_supply_chain:  +10  (nuova vulnerabilita' rivelata)
margini_attesi:         -5  (costi mangiano margini)
```

---

## EVENTO 14 — Fondo 300 miliardi Germania-India-Arabia Saudita
**ID:** 14 | **Categoria:** macroeconomia | **Tono:** positivo | **Origine:** Global | **Intensita':** ALTA

### Narrativa
Germania, India e Arabia Saudita lanciano un fondo congiunto da 300 miliardi per
infrastrutture, energia e modernizzazione industriale. Mega-ordini per macchinari,
energia e automazione su scala globale.

### Logica economica dettagliata
- **Industria (+7% a +10%):** CAT (+10%) mega-ordini macchinari edili. HON (+9%) sistemi di controllo. DE (+8%) agricoltura indiana. GE (+7%) turbine.
- **Energia (+4% a +7%):** XOM/CVX/SHEL (+7%) infrastrutture petrolifere saudite. TTE (+6%), BP (+5%) per espansione downstream.
- **Robotica (+3% a +6%):** SIEGY (+6%) automazione industriale. ABBNY (+5%) per robot.
- **Semi (+3% a +4%):** NVDA/AVGO (+4%) per chip infrastrutturali. MSFT (+3%) per cloud governance.
- **Difensivi penalizzati (-1% a -2%):** JNJ/UNH (-2%) per rotazione risk-on.

### Impatti numerici completi
```
Industria:  CAT +10.0  HON +9.0  DE +8.0  GE +7.0
Energia:    XOM +7.0  CVX +7.0  SHEL +7.0  TTE +6.0  BP +5.0  E +5.0  0883.HK +4.0
Robot:      SIEGY +6.0  ABBNY +5.0  FANUY +3.0
Semi:       NVDA +4.0  AVGO +4.0  MSFT +3.0
Auto:       TSLA +3.0
Healthcare: JNJ -2.0  UNH -2.0  NVO -1.0
Food:       KO -1.0  PEP -1.0
```

### Persistenza
**Pattern:** Compounding — `{1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50}`
Mega-progetti richiedono tempo per partire. Picco degli ordini al ciclo +2.

### Variabili interne
```
domanda_finale:       +15  (boom domanda infrastrutture)
capex_attesi:         +10  (investimenti record)
momentum_percepito:   +12  (sentiment positivo globale)
visibilita_utili:      +9  (ordini con visibilita' pluriennale)
```

---

## EVENTO 15 — Taiwan: elezioni contestate, ritardo export chip
**ID:** 15 | **Categoria:** geopolitica | **Tono:** negativo | **Origine:** Asia | **Intensita':** media-alta

### Narrativa
Elezioni presidenziali contestate a Taiwan. Proteste e paralisi istituzionale.
Il Ministero dell'Economia rallenta le licenze export per chip avanzati.
Ritardi burocratici di 3-4 settimane, senza blocco della produzione.

### Logica economica dettagliata
- **Semi (-3% a -8%):** TSM (-8%) epicentro Taiwan. NVDA (-5%) ritardi consegne GPU. ASML (-4%) per incertezza su nuovi ordini litografia.
- **Tech (-1.5% a -3%):** AAPL (-3%) per iPhone shipments. MSFT (-2%) per server.
- **Difensivi (+1% a +2%):** JNJ (+2%), LMT (+2%) per flight to safety.
- **Differenza da Evento 22:** Questo e' una perturbazione moderata (burocrazia), non un blocco militare. Impatti 3-5x inferiori.

### Impatti numerici completi
```
Semi:       TSM -8.0  NVDA -5.0  AVGO -4.0  ARM -4.0  IFNNY -3.0  ASML -4.0
Tech:       AAPL -3.0  MSFT -2.0  AMZN -1.5
Industria:  HON -2.0  CAT -1.5
Robot:      SIEGY -2.0  ABBNY -1.5  FANUY -2.0  BYDDY -1.5  LI -1.0
China:      0700.HK -2.0  BABA -1.5
Healthcare: JNJ +2.0  NVO +1.5  UNH +1.5  AZN +1.0  NVS +1.0
Difesa:     LMT +2.0
Auto:       TSLA -2.0
Food:       KO +1.0  PEP +1.0  DANOY +0.5
```

### Persistenza: `{1: 0.50, 2: 0.20}` — Breve, le elezioni si risolvono.

### Variabili interne
```
rischio_supply_chain:  +10  (reminder vulnerabilita' Taiwan)
visibilita_utili:       -6  (trimestre incerto)
volatilita_attesa:     +10  (nervosismo mercato)
multiplo_tollerato:     -5  (premio rischio piu' alto)
```

---

## EVENTO 16 — RDC sospende export cobalto dal Copperbelt
**ID:** 16 | **Categoria:** geopolitica | **Tono:** negativo | **Origine:** Africa | **Intensita':** media-alta

### Narrativa
La RDC (70% del cobalto mondiale) sospende le licenze di export. Il cobalto e' cruciale
per batterie Li-ion (EV, smartphone, laptop), superleghe (turbine, jet) e catalizzatori.

### Logica economica dettagliata
- **EV devastate (-4% a -6%):** TSLA (-6%) batterie NCA/NMC usano cobalto. LI (-4%) mercato cinese con alternative ma comunque esposta. BYDDY (-5%) per batterie.
- **Industria (-3% a -6%):** CAT/HON (-6%) per superleghe in turbine e macchinari. TSM/AVGO (-5%) per leghe nei packaging chip.
- **Energia beneficia (+2% a +3%):** XOM/CVX/SHEL (+3%) perche' la crisi materiali rallenta la transizione energetica → piu' fossile.

### Impatti numerici completi
```
Industria:  CAT -6.0  HON -6.0  DE -3.0
Semi:       TSM -5.0  AVGO -5.0  NVDA -4.0  ARM -3.0  IFNNY -4.0
Robot:      SIEGY -4.0  ABBNY -3.0  FANUY -3.0  BYDDY -5.0
Auto:       TSLA -6.0  LI -4.0
Energia:    XOM +3.0  CVX +3.0  SHEL +3.0  0883.HK +2.0
Healthcare: JNJ +2.0  NVO +1.0
```

### Persistenza: `{1: 0.60, 2: 0.30, 3: 0.10}`

### Variabili interne
```
costi_operativi:     +10  (cobalto spot +60%)
visibilita_utili:     -8  (incertezza durata sospensione)
volatilita_attesa:   +12  (mercato nervoso su materiali critici)
margini_attesi:       -4  (costi mangiano profitti)
```

---

## EVENTO 17 — Ondata calore Argentina/Brasile: 30% raccolto distrutto
**ID:** 17 | **Categoria:** crisi_ambientale | **Tono:** negativo | **Origine:** Americas | **Intensita':** media-alta

### Narrativa
Temperature record (+45°C per 3 settimane) devastano le pianure cerealicole di Argentina
e Brasile. Il 30% del raccolto di soia e mais distrutto. Prezzi commodity agricole ai massimi.

### Logica economica dettagliata
- **Food penalizzato (-1.5% a -4%):** MCD (-4%) per costi materie prime su menu. NSRGY/DANOY (-3%) per ingredienti. KO/PEP (-1.5%) per dolcificanti a base mais.
- **Agri-machinery beneficia (+4% a +6%):** DE (+6%) per ordini irrigazione e tecnologie climate-proof. CAT (+4%) per macchinari agricoli.
- **Energia (+1% a +2%):** XOM/CVX (+2%) per fertilizzanti = piu' gas naturale richiesto.

### Impatti numerici completi
```
Food:       MCD -4.0  NSRGY -3.0  DANOY -3.0  MDLZ -2.0  UL -2.0  KO -1.5  PEP -1.5
Industria:  DE +6.0  CAT +4.0
Energia:    XOM +2.0  CVX +2.0  SHEL +1.0
Healthcare: JNJ +1.0  UNH +1.0
E-commerce: AMZN -1.0
```

### Persistenza
**Pattern:** Lagged — `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}`

L'effetto e' immediato sui futures, ma le scorte si esauriscono gradualmente.
Il costo reale per le aziende food arriva nei trimestri successivi.

### Variabili interne
```
costi_operativi:    +8  (materie prime agricole +30%)
margini_attesi:     -6  (aziende food non possono alzare prezzi subito)
domanda_finale:     -3  (consumatori tagliano spesa)
visibilita_utili:   -4  (incertezza su prossimo raccolto)
```

---

## EVENTO 18 — Porto di Busan: nuovo hub asiatico chip e robotica
**ID:** 18 | **Categoria:** macroeconomia | **Tono:** positivo | **Origine:** Asia | **Intensita':** media

### Narrativa
Busan (Corea del Sud) ottiene corsie doganali prioritarie per semiconduttori e robotica.
Nuovo hub logistico dedicato riduce tempi e costi per spedizioni tech.

### Logica economica dettagliata
- **Semi (+3% a +6%):** TSM (+6%) per logistica piu' efficiente verso assemblatori. AVGO (+5%) per chip networking.
- **Robotica (+2% a +4%):** FANUY (+4%) per distribuzione FANUC piu' rapida. SIEGY (+3%) per hub vicino a fabbriche coreane.
- **UPS/FDX (-2%):** Nuove infrastrutture riducono la dipendenza da corrieri tradizionali.

### Impatti numerici completi
```
Semi:       TSM +6.0  AVGO +5.0  NVDA +3.0  ARM +3.0  IFNNY +4.0  ASML +3.0
Robot:      SIEGY +3.0  FANUY +4.0  ABBNY +2.0  BYDDY +2.0
Industria:  HON +2.0
China:      0700.HK +2.0  BABA +1.0
Auto:       LI +2.0
Logistica:  UPS -2.0  FDX -2.0
```

### Persistenza: Lagged — `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}`

### Variabili interne
```
rischio_supply_chain:   -6  (hub riduce bottleneck)
visibilita_utili:       +5  (supply chain piu' prevedibile)
costi_operativi:        -4  (meno costi logistici)
momentum_percepito:     +5  (sentiment positivo su Asia tech)
```

---

## EVENTO 19 — Texas: mega-incentivi centrali elettriche AI/cloud
**ID:** 19 | **Categoria:** macroeconomia | **Tono:** positivo | **Origine:** USA | **Intensita':** ALTA

### Narrativa
Il Texas approva incentivi miliardari per centrali elettriche dedicate ai data center
AI e cloud. L'energia diventa il fattore abilitante dell'AI. Il rischio "power bottleneck"
che frenava l'espansione AI viene eliminato.

### Logica economica dettagliata
- **AI epicentro (+4% a +9%):** NVDA (+9%) piu' data center = piu' GPU vendute. MSFT (+8%) Azure senza limiti energetici. AVGO (+7%) chip networking. ARM (+6%) per architetture data center. AMZN (+6%) per AWS.
- **Energia beneficia (+3% a +5%):** XOM (+3%) e CVX (+3%) per domanda elettrica fossile nel breve termine (gas naturale per centrali). La transizione all'AI AUMENTA la domanda energetica.
- **Industria (+3% a +4%):** HON/CAT (+4%) per costruzione centrali. GE (+3%) per turbine a gas.

### Impatti numerici completi
```
AI:         NVDA +9.0  MSFT +8.0  AVGO +7.0  ARM +6.0  AMZN +6.0  GOOGL +4.0
Semi:       ASML +5.0  IFNNY +3.0
Industria:  HON +4.0  CAT +4.0  GE +3.0
Energia:    XOM +3.0  CVX +3.0
Auto:       TSLA +2.0
Healthcare: JNJ -1.0  TTE -1.0  NVO -0.5
```

### Persistenza
**Pattern:** Compounding — `{1: 0.70, 2: 1.00, 3: 0.80, 4: 0.50}`
Centrali richiedono 2-3 anni per costruzione. Gli ordini crescono nel tempo.

### Variabili interne
```
capex_attesi:           +14  (investimenti infrastrutturali massivi)
rischio_supply_chain:   -12  (power bottleneck eliminato)
momentum_percepito:     +12  (forte sentiment pro-AI)
visibilita_utili:        +8  (domanda strutturale visibile)
```

---

## EVENTO 20 — Emirati Arabi: zona economica speciale Golfo-India-Africa
**ID:** 20 | **Categoria:** macroeconomia | **Tono:** positivo | **Origine:** Middle East | **Intensita':** media

### Narrativa
Gli EAU creano una zona franca trilaterale per raffinazione, logistica e manifattura
avanzata collegando Golfo, India e Africa orientale. Nuovo corridoio commerciale Sud-Sud.

### Logica economica dettagliata
- **Energia (+3% a +6%):** XOM/SHEL (+6%) per infrastrutture raffinazione Golfo. TTE/CVX (+5%) per downstream. BP/E (+4%) per espansione distribuzione.
- **Industria (+3% a +5%):** CAT (+5%) per costruzioni portuali e stradali. HON (+4%) per sistemi automazione. GE (+3%) per impiantistica.
- **Logistica (+2% a +3%):** UPS/FDX (+3%) per nuove rotte commerciali.

### Impatti numerici completi
```
Energia:    XOM +6.0  SHEL +6.0  TTE +5.0  CVX +5.0  BP +4.0  E +4.0  0883.HK +3.0
Industria:  CAT +5.0  HON +4.0  GE +3.0  DE +3.0  SIEGY +3.0  ABBNY +2.0
Logistica:  UPS +3.0  FDX +3.0
Luxury:     MC.PA +2.0
Healthcare: JNJ -1.0  NVO -0.5
```

### Persistenza: Lagged — `{1: 1.00, 2: 0.70, 3: 0.30, 4: 0.10}`

### Variabili interne
```
capex_attesi:          +10  (investimenti infrastrutturali)
momentum_percepito:     +8  (nuovo corridoio commerciale)
domanda_finale:         +5  (nuovi mercati)
costi_operativi:        -3  (zone franche = meno tasse)
```

---

# PARTE 3 — EVENTI CATASTROFICI (21-24)

> **Caratteristiche speciali:**
> - `cap_override: True` → cap piu' alti (large_cap 18%, high_vol 24%, defensive 9%)
> - `cascade_impacts` → impatti ADDIZIONALI separati dalla persistenza nei cicli +1, +2, +3
> - Anti-catastrofe ridotta (8% vs 17.5%) se 3+ eventi negativi nel ciclo

---

## EVENTO 21 — Scontro navale Stretto di Malacca: blocco totale 11 giorni
**ID:** 21 | **Categoria:** cigno_nero | **Intensita':** ESTREMA | **Origine:** Asia | **cap_override:** True

### Narrativa completa
Un incidente navale tra navi militari cinesi e una coalizione indo-americana nello Stretto
di Malacca provoca il blocco totale del transito marittimo per undici giorni.

**Contesto geopolitico:** Lo Stretto di Malacca e' un braccio di mare lungo 900 km che
separa Sumatra (Indonesia) e la penisola malese. Transitano 16 milioni di barili di petrolio
al giorno (secondo chokepoint mondiale dopo Hormuz) e il 50% della flotta mercantile globale.
La Cina, primo importatore mondiale di petrolio greggio (204 mld USD/anno), dipende da
Malacca per il 75% delle sue importazioni energetiche. Anche Giappone e Corea del Sud sono
criticamente dipendenti.

**Effetti immediati:**
- 50% flotta mondiale rerouted via Lombok o Capo di Buona Speranza (tempi triplicati)
- Premi assicurativi marittimi +400%
- Raffinerie asiatiche con scorte a 3-5 giorni
- Porti di Shanghai, Singapore e Busan dichiarano forza maggiore
- Supply chain JIT di elettronica, auto e industriale in tilt totale

**Effetti cascata (cicli successivi):**
- Ciclo +1: scorte componenti elettronici e auto si esauriscono
- Ciclo +2: PICCO — linee produttive ferme in Cina, Giappone, Corea, Europa
- Ciclo +3: rotte alternative via Lombok operative, lento rientro

### Impatti numerici completi — Ciclo 0
```
Energia:    XOM +12.0  CVX +12.0  SHEL +11.0  TTE +10.0  BP +9.0  E +8.0  0883.HK +7.0
Difesa:     LMT +6.0
Healthcare: JNJ +4.0  UNH +3.0  NVO +3.0  AZN +2.0  NVS +2.0  LLY +2.0
Biotech:    BNTX +1.0  AMGN +1.0  VRTX +1.0  DHR +1.0  GMAB +1.0  BGI +0.5
Med Pers:   A +1.0  IQV +1.0
Food:       KO +3.0  PEP +3.0  MCD +2.0  NSRGY +2.0  DANOY +1.5  MDLZ +1.5  UL +1.5
Semi:       TSM -15.0  NVDA -10.0  AVGO -9.0  ARM -8.0  ASML -7.0  IFNNY -6.0
Logistica:  UPS -12.0  FDX -12.0  UNP -6.0
Tech:       AAPL -10.0  MSFT -5.0  GOOGL -3.0  META -3.0  AMZN -6.0  SAP -2.0
China:      0700.HK -8.0  BABA -7.0  BIDU -5.0
Robot:      SIEGY -6.0  ABBNY -5.0  FANUY -6.0  BYDDY -5.0  ISRG +1.0
Industria:  CAT -5.0  HON -5.0  DE -4.0  GE -3.0
Auto:       TSLA -7.0  LI -8.0  RACE -2.0
Luxury:     MC.PA -5.0
```

### Cascade impacts (ADDIZIONALI alla persistenza)
| Ciclo | Narrativa | Impatti |
|-------|-----------|---------|
| +1 | Scorte componenti si esauriscono | TSLA -5%, LI -6%, RACE -3%, CAT -4%, DE -3%, SIEGY -4%, FANUY -4%, BYDDY -3% |
| +2 | **PICCO — Linee produttive ferme** | TSLA -8%, LI -9%, RACE -4%, CAT -6%, HON -5%, SIEGY -6%, ABBNY -4%, FANUY -5%, AAPL -5%, AMZN -3% |
| +3 | Rotte alternative operative, lento rientro | TSLA -4%, LI -5%, CAT -3%, AAPL -3% |

### Persistenza: Compounding — `{1: 0.80, 2: 1.00, 3: 0.70, 4: 0.40}`

### Impatto cumulativo completo su TSLA (esempio)
| Ciclo | Persistenza | Cascade | **TOTALE** |
|-------|------------|---------|------------|
| 0 | -7.0% (100%) | — | **-7.0%** |
| +1 | -5.6% (80%) | -5.0% | **-10.6%** |
| +2 | -7.0% (100%) | -8.0% | **-15.0%** |
| +3 | -4.9% (70%) | -4.0% | **-8.9%** |
| +4 | -2.8% (40%) | — | **-2.8%** |

**Totale impatto su 5 cicli: ~-44.3% cumulativo** (prima dei cap e beta)

### Variabili interne
```
rischio_supply_chain:  +30  (massimo storico)
costi_operativi:       +20  (rotte alternative costosissime)
visibilita_utili:      -15  (impossibile fare previsioni)
volatilita_attesa:     +25  (mercati in panico)
fragilita_strategica:  +15  (dipendenza da Malacca rivelata)
```

---

## EVENTO 22 — Blocco navale cinese su Taiwan: chip avanzati fermi
**ID:** 22 | **Categoria:** cigno_nero | **Intensita':** ESTREMA | **Origine:** Asia | **cap_override:** True

### Narrativa completa
La Cina dichiara una zona di esclusione militare intorno a Taiwan dopo una visita di stato
americana a Taipei. TSMC sospende tutte le spedizioni internazionali.

**Contesto:** Taiwan produce il 60% dei semiconduttori mondiali e oltre il 90% dei chip
avanzati sotto i 7nm. TSMC da sola fornisce Apple, NVIDIA, AMD, Qualcomm, MediaTek e
centinaia di altri clienti. Non esistono alternative a breve termine: le fab Intel e Samsung
non hanno capacita' sufficiente per coprire neanche il 20% della domanda.

**Effetti immediati:**
- TSMC sospende tutte le spedizioni internazionali
- Apple, NVIDIA e centinaia di aziende dichiarano forza maggiore
- Lead time per chip: da settimane a mesi
- Il Pentagono attiva piani di emergenza per supply chain difesa

**Effetti cascata:**
- Ciclo +1: auto, robotica e elettronica di consumo senza chip ECU/ADAS
- Ciclo +2: PICCO — produzione mondiale ferma, PIL trimestre negativo
- Ciclo +3: foundry alternative (Intel, Samsung) coprono parzialmente

### Impatti numerici completi — Ciclo 0
```
Semi:       TSM -18.0  NVDA -16.0  ARM -14.0  AVGO -12.0  ASML -8.0  IFNNY -8.0
Tech:       AAPL -12.0  MSFT -7.0  GOOGL -5.0  META -5.0  AMZN -6.0  SAP -2.0
China:      0700.HK -10.0  BABA -8.0  BIDU -7.0
Robot:      SIEGY -7.0  ABBNY -5.0  FANUY -7.0  BYDDY -6.0  ISRG -4.0
Auto:       TSLA -10.0  LI -10.0  RACE -3.0
Industria:  CAT -4.0  HON -5.0  DE -3.0  GE -4.0
Logistica:  UPS -5.0  FDX -5.0  UNP -3.0
Med Pers:   A -3.0  IQV -2.0  WAT -3.0
Difesa:     LMT +6.0
Healthcare: JNJ +5.0  UNH +4.0  NVO +4.0  AZN +3.0  NVS +3.0  LLY +3.0
Food:       KO +4.0  PEP +4.0  MCD +3.0  NSRGY +3.0  DANOY +2.0  MDLZ +2.0  UL +2.0
Biotech:    BNTX +2.0  AMGN +2.0  VRTX +2.0  GMAB +1.0  BGI -1.0  DHR -2.0
Energia:    XOM +3.0  CVX +3.0  SHEL +2.0  TTE +1.0
Luxury:     MC.PA -7.0
```

### Cascade impacts
| Ciclo | Narrativa | Impatti |
|-------|-----------|---------|
| +1 | Auto/robotica senza chip, scorte esaurite | TSLA -8%, RACE -4%, LI -8%, ISRG -5%, SIEGY -5%, FANUY -5%, CAT -3%, HON -4% |
| +2 | **PICCO — Produzione mondiale ferma** | TSLA -12%, RACE -6%, LI -12%, ISRG -7%, SIEGY -8%, FANUY -7%, ABBNY -5%, CAT -5%, HON -6%, GE -4%, AAPL -8%, AMZN -5% |
| +3 | Foundry alternative coprono parte domanda | TSLA -6%, LI -6%, SIEGY -4%, FANUY -4%, CAT -3%, AAPL -4% |

### Persistenza: `{1: 0.90, 2: 1.00, 3: 0.80, 4: 0.60}` — Decadimento LENTISSIMO

### Impatto cumulativo su AAPL (esempio)
| Ciclo | Persistenza | Cascade | **TOTALE** |
|-------|------------|---------|------------|
| 0 | -12.0% | — | **-12.0%** |
| +1 | -10.8% (90%) | — | **-10.8%** |
| +2 | -12.0% (100%) | -8.0% | **-20.0%** (cap -18%) |
| +3 | -9.6% (80%) | -4.0% | **-13.6%** |
| +4 | -7.2% (60%) | — | **-7.2%** |

### Variabili interne
```
rischio_supply_chain:  +35  (crisi senza precedenti)
visibilita_utili:      -20  (zero visibilita')
volatilita_attesa:     +30  (mercati in panico totale)
fragilita_strategica:  +20  (dipendenza Taiwan rivelata)
multiplo_tollerato:    -15  (mercato non tollera PE alti in crisi)
costi_operativi:       +15  (alternative costosissime)
```

---

## EVENTO 23 — Embargo terre rare cinesi verso USA e UE
**ID:** 23 | **Categoria:** geopolitica | **Intensita':** ESTREMA | **Origine:** Asia | **cap_override:** True

### Narrativa completa
Pechino annuncia l'embargo totale sull'esportazione di 17 elementi delle terre rare,
gallio e germanio verso USA e UE, in risposta ai dazi occidentali sui semiconduttori cinesi.

**Contesto:** La Cina controlla il 70% della produzione mondiale e il 90% della raffinazione
di terre rare. Gallio e germanio sono essenziali per chip avanzati (substrati III-V), fibre
ottiche e celle solari. Le terre rare servono per magneti permanenti (motori EV, turbine
eoliche, missili guidati), smartphone, disk drive e molto altro.

**Dinamica unica:** Questo e' l'unico evento catastrofico dove alcune aziende BENEFICIANO.
Le aziende cinesi con supply chain domestica guadagnano quote di mercato a spese dei
concorrenti occidentali. Crea un dilemma strategico per i giocatori.

### Impatti numerici completi — Ciclo 0
```
Semi:       NVDA -10.0  ASML -9.0  ARM -8.0  AVGO -8.0  TSM -7.0  IFNNY -7.0
Tech:       AAPL -8.0  MSFT -4.0  GOOGL -3.0  META -2.0  AMZN -3.0  SAP -1.0
China BENEFICIA: 0700.HK +4.0  BABA +3.0  BIDU +2.0
Robot:      SIEGY -7.0  ABBNY -6.0  FANUY -7.0  BYDDY +3.0 (cinese!)  ISRG -4.0
Auto:       TSLA -10.0  LI +2.0 (cinese!)  RACE -2.0
Industria:  CAT -5.0  HON -6.0  DE -4.0  GE -6.0
Difesa:     LMT -4.0 (missili usano terre rare)
Energia:    XOM +3.0  CVX +3.0  SHEL -2.0  TTE -1.0
Food:       KO +2.0  PEP +2.0  MCD +1.0  NSRGY +1.0
Healthcare: JNJ +3.0  UNH +2.0  NVO +2.0  AZN +1.0
Logistica:  UPS -3.0  FDX -3.0
Biotech:    DHR -1.0  BNTX +1.0
Luxury:     MC.PA -3.0
```

### Cascade impacts
| Ciclo | Narrativa | Impatti |
|-------|-----------|---------|
| +1 | Magneti per motori EV e robot si esauriscono | TSLA -6%, GE -5%, SIEGY -5%, FANUY -5%, ISRG -3% |
| +2 | **PICCO — Linee occidentali ferme, cinesi guadagnano share** | TSLA -10%, GE -7%, CAT -4%, **LI +3%**, **BYDDY +5%** |
| +3 | Shortage gallio/germanio colpisce anche chip | AAPL -5%, MSFT -3%, NVDA -5% |

**Nota cascade ciclo +2:** LI e BYDDY hanno cascade POSITIVI. Le aziende cinesi con supply
chain domestica rubano quote di mercato ai concorrenti occidentali bloccati.

### Persistenza: `{1: 0.70, 2: 1.00, 3: 0.70, 4: 0.40}`

### Variabili interne
```
rischio_supply_chain:  +25  (materiali critici bloccati)
costi_operativi:       +18  (alternative rare e costose)
visibilita_utili:      -12  (orizzonte temporale incerto)
volatilita_attesa:     +20  (mercati in panico)
fragilita_strategica:  +15  (dipendenza dalla Cina esposta)
```

---

## EVENTO 24 — Pandemia H5N1: OMS dichiara pandemia (mortalita' 15%)
**ID:** 24 | **Categoria:** cigno_nero | **Intensita':** ESTREMA | **Origine:** Global | **cap_override:** True

### Narrativa completa
Dopo mesi di diffusione negli allevamenti bovini nordamericani, il virus H5N1 sviluppa
mutazioni che ne consentono la trasmissione interumana efficiente. L'OMS dichiara lo stato
di pandemia globale con un tasso di mortalita' preliminare del 15% — ben superiore al
COVID-19 (0.5-1%).

**Contesto scientifico:** L'H5N1 ha gia' infettato migliaia di allevamenti e diverse decine
di farmworkers. La comunita' scientifica (Harvard Chan School, CDC, OMS) aveva da tempo
avvertito che la prossima pandemia non era questione di "se" ma di "quando". Le piattaforme
vaccinali mRNA sviluppate durante COVID sono pronte per essere adattate, ma i tempi di
produzione e distribuzione di massa richiedono mesi.

**Dinamica temporale (unica nel gioco):**
- Ciclo 0: Panico globale, panic selling, lockdown
- Ciclo +1: Lockdown devastano servizi, lusso, ristorazione
- Ciclo +2: Domanda industriale crolla, energia ferma
- Ciclo +3: **INVERSIONE** — il vaccino arriva, biotech rimbalza forte

### Impatti numerici completi — Ciclo 0
```
Biotech ESPLODE: BNTX +16.0  BGI +10.0  DHR +8.0  GMAB +5.0  AMGN +4.0  VRTX +3.0
Med Pers:   A +6.0  IQV +5.0  WAT +4.0
Healthcare: JNJ +6.0  AZN +5.0  NVS +4.0  NVO +3.0  LLY +5.0  UNH +2.0
Tech WFH:   MSFT +3.0  AMZN +2.0
Difesa:     LMT +2.0
Food Staples: KO +2.0  PEP +2.0  NSRGY +3.0  DANOY +2.0  MDLZ +2.0  UL +2.0
---
Tech colpiti: AAPL -6.0  GOOGL -2.0  META -3.0  SAP -1.0
Semi:       NVDA -4.0  ARM -3.0  AVGO -3.0  TSM -4.0  ASML -3.0  IFNNY -3.0
China:      0700.HK -4.0  BABA -3.0  BIDU -3.0
Industria:  CAT -8.0  HON -6.0  DE -5.0  GE -5.0
Energia:    XOM -8.0  CVX -8.0  SHEL -7.0  TTE -6.0  BP -6.0  E -5.0  0883.HK -5.0
Auto:       TSLA -8.0  RACE -5.0  LI -7.0
Logistica:  UPS -4.0  FDX -4.0  UNP -3.0
Robot:      ISRG -3.0  SIEGY -4.0  ABBNY -3.0  BYDDY -3.0  FANUY -3.0
Food Ristoranti: MCD -4.0
Luxury:     MC.PA -10.0
```

### Cascade impacts
| Ciclo | Narrativa | Impatti |
|-------|-----------|---------|
| +1 | Lockdown devastano servizi/lusso/logistica | MCD -6%, MC.PA -8%, RACE -5%, UPS -5%, FDX -5% |
| +2 | Domanda crolla, industria e energia ferme | CAT -5%, HON -4%, DE -4%, TSLA -5%, XOM -4%, CVX -4% |
| +3 | **INVERSIONE — Vaccino arriva, biotech rialza** | **BNTX +8%**, **BGI +5%**, **DHR +4%**, **A +3%**, **LLY +3%** |

**Dinamica di gioco unica:** Il ciclo +3 ha cascade POSITIVI per il biotech. Chi compra BNTX
dopo il panic selling iniziale e tiene durante la crisi viene premiato con il rimbalzo vaccino.
Questa e' la lezione del COVID applicata al gioco.

### Persistenza: Wave — `{1: 0.80, 2: 0.60, 3: 0.40, 4: 0.30}`

### Impatto cumulativo su BNTX (esempio — il vincitore della pandemia)
| Ciclo | Persistenza | Cascade | **TOTALE** |
|-------|------------|---------|------------|
| 0 | +16.0% | — | **+16.0%** |
| +1 | +12.8% (80%) | — | **+12.8%** |
| +2 | +9.6% (60%) | — | **+9.6%** |
| +3 | +6.4% (40%) | +8.0% | **+14.4%** |
| +4 | +4.8% (30%) | — | **+4.8%** |

**Totale impatto su 5 cicli: +57.6% cumulativo** (prima dei cap e beta)

### Variabili interne
```
domanda_finale:        -20  (lockdown distruggono domanda)
visibilita_utili:      -15  (zero visibilita')
volatilita_attesa:     +25  (panico globale)
rischio_supply_chain:  +15  (fabbriche chiuse)
fragilita_strategica:  +10  (vulnerabilita' biologica)
costi_operativi:       +10  (protocolli sanitari, quarantene)
```

---

# PARTE 4 — EVENTO ANTI-DIFENSIVI (25)

---

## EVENTO 25 — Scandalo PFAS: EPA scopre contaminazione in 14 stabilimenti food/pharma
**ID:** 25 | **Categoria:** regolamentazione | **Tono:** negativo | **Origine:** USA | **Intensita':** alta

### Narrativa completa
L'Environmental Protection Agency pubblica un rapporto esplosivo che documenta livelli
di PFAS (sostanze perfluoroalchiliche, "forever chemicals") 200 volte superiori ai limiti
di sicurezza nelle acque di scarico e nei prodotti finiti di 14 stabilimenti alimentari
e farmaceutici negli USA.

**Stabilimenti coinvolti:** Impianti di imbottigliamento di bevande, fabbriche di latticini,
siti di produzione farmaci generici. La FDA ordina il ritiro precauzionale di centinaia
di lotti. Class action da miliardi di dollari depositate in 48 ore.

**Funzione nel gioco:** Questo evento esiste per PUNIRE la strategia "rifugio nei difensivi".
I titoli food e pharma — tradizionale porto sicuro durante le crisi — subiscono un crollo
inatteso. Rompe l'assunzione "compra KO/JNJ e dormi tranquillo".

### Logica economica dettagliata
- **Food devastato (-4% a -6%):** KO (-6%) per contaminazione acque imbottigliamento. PEP/NSRGY/DANOY (-5%) per latticini e snack. MCD/MDLZ/UL (-4%) per supply chain food compromessa.
- **Pharma colpita (-2% a -5%):** JNJ (-5%) per produzione farmaci contaminata. NVS (-3%), AZN (-2%) per precedente regolatorio. UNH (-3%) per costi sanitari screening PFAS.
- **Diagnostica BENEFICIA (+3% a +5%):** DHR (+5%) e WAT (+5%) per strumenti di analisi PFAS. A (+4%) per testing laboratorio. IQV (+3%) per clinical trials effetti PFAS.
- **Genomica (+2% a +3%):** BGI (+3%) per studio effetti genetici PFAS. GMAB (+2%).
- **Tech beneficia (+1% a +2%):** NVDA/MSFT (+2%) per rotazione da difensivi verso growth.
- **NVO (-2%):** Esposta come pharma europea (precedente regolatorio).
- **LLY (+2%):** NON coinvolta → differenziazione positiva, guadagna share.

### Impatti numerici completi
```
Food:       KO -6.0  PEP -5.0  MCD -4.0  NSRGY -5.0  DANOY -5.0  MDLZ -4.0  UL -4.0
Pharma:     JNJ -5.0  NVS -3.0  AZN -2.0  UNH -3.0  NVO -2.0
Diagnostica: DHR +5.0  WAT +5.0  A +4.0  IQV +3.0
Genomica:   BGI +3.0  GMAB +2.0
Pharma non coinvolta: LLY +2.0
Tech:       NVDA +2.0  MSFT +2.0  AAPL +1.5  META +1.0  GOOGL +1.0  AMZN +1.0
Energia:    XOM +1.5  CVX +1.5
```

### Persistenza: Spike — `{1: 0.50, 2: 0.25}`
Breve ma devastante. Lo scandalo si smorza quando i ritiri finiscono, ma le class action
continuano a pesare per 1-2 cicli.

### Variabili interne
```
rischio_regolatorio:   +15  (precedente normativo enorme)
visibilita_utili:       -8  (costi class action imprevedibili)
fragilita_strategica:  +10  (reputazione compromessa)
margini_attesi:         -6  (ritiri + spese legali)
```

---

# PARTE 5 — ANALISI TRASVERSALE

## 5.1 Matrice Settore × Evento

| Evento | Tech | AI/Semi | Health | Biotech | MedPers | Robot | Industria | Logistica | Energia | Food | Auto | Luxury |
|--------|------|---------|--------|---------|---------|-------|-----------|-----------|---------|------|------|--------|
| 1 Fed | +++ | +++ | - | ++ | + | +++ | ++ | + | --- | - | +++ | + |
| 2 Sing | --- | -- | ++ | | | --- | -- | --- | + | + | -- | |
| 3 Patto | + | ++++ | - | | | +++ | + | | - | | + | |
| 4 Mexico | ++ | - | | | | ++ | ++++ | +++ | | | + | |
| 5 EU DC | --- | --- | | | | + | + | | +++ | | | |
| 6 EU AI | ---- | --- | ++ | | | | | | | + | | |
| 7 MarRosso | ++ | ++ | | | | + | +++ | ++++ | -- | + | + | + |
| 8 Rame | - | --- | ++ | + | | --- | ---- | | | + | -- | |
| 9 Robot | + | ++ | - | | | +++++ | + | - | | | | |
| 10 Cons | --- | | +++ | | | | -- | --- | + | +++ | --- | -- |
| 11 Cyber | ---- | -- | +++ | | | | --- | ----- | + | + | -- | - |
| 13 Panama | -- | -- | + | | | | --- | ---- | | - | - | |
| 14 Infra | + | ++ | - | | | +++ | +++++ | ++ | ++++ | - | + | |
| 15 Taiwan | -- | --- | + | | | - | - | | | + | - | |
| 16 Cobalto | | -- | + | | | -- | --- | | ++ | | --- | |
| 17 Calore | | | + | | | | ++ | | + | --- | | |
| 18 Busan | | +++ | | | | ++ | + | - | | | + | |
| 19 Texas | +++ | +++++ | | | | | ++ | | ++ | | + | |
| 20 EAU | | | | | | + | +++ | ++ | ++++ | | | + |
| **21 Malacca** | --- | ----- | +++ | + | + | --- | --- | ----- | +++++ | ++ | --- | -- |
| **22 Taiwan** | ---- | ------ | ++++ | + | -- | ---- | --- | -- | ++ | +++ | ----- | --- |
| **23 Terre rare** | --- | ----- | ++ | | | ---- | --- | -- | + | + | ----- | - |
| **24 Pandemia** | - | -- | ++++ | +++++ | ++++ | -- | ---- | -- | ---- | ± | ---- | ----- |
| **25 PFAS** | + | + | ---- | ++ | +++ | | | | + | ----- | | |

Legenda: +++++ = molto positivo, ----- = molto negativo, ± = misto

## 5.2 Conteggio eventi per settore

| Settore | N. eventi positivi | N. eventi negativi | Bilancio |
|---------|-------------------|-------------------|----------|
| Semiconduttori | 7 (1,3,7,9,14,18,19) | 8 (2,5,8,13,15,16,22,23) | Leggermente negativo |
| Tech | 5 (1,4,7,18,19) | 7 (2,5,6,10,11,22,24) | Negativo |
| Energia | 7 (5,8,14,16,19,20,21) | 3 (1,7,24) | **Molto positivo** |
| Industria | 5 (4,9,14,17,20) | 7 (2,8,10,13,16,21,24) | Leggermente negativo |
| Healthcare | 8 (2,6,8,10,11,13,15,21) | 2 (1,25) | **Molto positivo** |
| Food/Difensivi | 4 (2,10,11,21) | 3 (17,24,25) | Neutro |
| Biotech | 2 (24 cascade+3) | 0 | Positivo (niche) |
| Robotica | 4 (3,9,18,19) | 7 (2,8,16,21,22,23,24) | Negativo |
| Auto | 2 (1,4) | 10 (2,8,10,16,21,22,23,24,...) | **Molto negativo** |
| Logistica | 3 (4,7,20) | 6 (2,11,13,21,22,24) | Negativo |

## 5.3 Note di design strategico

### L'energia come tema chiave
L'energia non e' bipolare/casuale. Ogni movimento e' motivato da una logica specifica:
- **Sale quando:** chokepoint bloccati (Malacca +12%, Panama +3%), infrastrutture (fondo 300mld +7%), premio geopolitico, transizione energetica rallentata (embargo terre rare +3%)
- **Scende quando:** distruzione domanda (pandemia -8%), normalizzazione rotte (Mar Rosso -2%), tassi bassi (Fed -3%)

I giocatori devono capire PERCHE' l'energia si muove e posizionarsi di conseguenza.

### Un solo evento anti-difensivi (Evento 25)
Lo scandalo PFAS esiste per rompere la strategia "rifugio nei difensivi". Ma e' uno solo perche':
- I difensivi DEVONO restare generalmente sicuri (e' la loro funzione nel portafoglio)
- Un singolo evento imprevedibile basta a creare incertezza strategica
- Troppi eventi anti-difensivi eliminerebbero ogni porto sicuro, rendendo il gioco frustrante

### I cascade come differenziatore catastrofico
Gli eventi 21-24 non sono "impatti piu' grandi". La differenza sono i CASCADE:
- Il picco del danno arriva al **ciclo +2**, non al ciclo dell'evento
- Questo premia i giocatori che ANTICIPANO la cascata e vendono prima del picco
- O che comprano al bottom del ciclo +2 (quando il peggio e' passato)

### Il dilemma cinese (Evento 23)
L'embargo terre rare e' l'unico evento dove le aziende cinesi BENEFICIANO progressivamente.
Al ciclo +2, LI fa +3% e BYDDY +5% mentre TSLA fa -10%. Questo crea un dilemma:
- Vendere occidentali e comprare cinesi prima del picco?
- Ma le cinesi sono titoli "rischiosi" con alta volatilita'...
- Il giocatore deve soppesare rischio vs opportunita'

### La lezione COVID (Evento 24)
La pandemia e' l'unico evento con cascade POSITIVO al ciclo +3 (vaccino).
BNTX rimbalza di +8% dopo essere salita di +16% al ciclo 0.
Chi compra BNTX durante il panico viene premiato con il "rimbalzo vaccino".
Questa dinamica replica l'esperienza reale del 2020-2021.
