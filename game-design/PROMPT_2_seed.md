# PROMPT 2 — Aggiornamento `database/seed.py`

## Obiettivo
Sostituire la lista `SECURITIES` nel file `database/seed.py` con i **32 nuovi titoli** (8 settori × 4 aziende) basati su dati reali di aprile 2026, allineati alla giornata formativa "Surf the Future" (STF) di Allianz Bank.

## File da modificare
`database/seed.py`

## Istruzione
Nel file `database/seed.py`, sostituisci SOLO la costante `SECURITIES` (e il commento che la precede) con il blocco qui sotto.  
Mantieni **invariate** tutte le altre parti del file: import, funzione `main()`, logica di seeding del database, commenti iniziali del modulo.

---

### Nuovo blocco `SECURITIES` da inserire:

```python
# ─── SECURITIES (32 titoli reali) ─────────────────────────────────────────
# Settori: Biotech & Gene Therapy, AI Drug Discovery, Robotics & Automation,
#          Semiconductor & AI Infra, Nuclear & Clean Energy, Healthcare Systems,
#          Logistics & Supply Chain, Food & AgriTech
# Dati aggiornati ad aprile 2026.
# market_cap in dollari | pe_ratio | eps | dividend_yield % | roi | roe | target_price
# risk 1-10 | beta | revenue in dollari | ebitda in dollari | annual_performance (decimale)

SECURITIES = [

    # ══════════════════════════════════════════════════════
    # SETTORE 1 — BIOTECH & GENE THERAPY
    # ══════════════════════════════════════════════════════

    {"ticker": "BNTX", "name": "BioNTech SE",
     "description": "BioNTech è il pioniere della piattaforma mRNA oncologica, costruita sulle riserve di liquidità da €17,2 miliardi accumulate con i vaccini COVID. Nel 2026 ha 15 trial di Fase 3 attivi in oncologia — tumore al pancreas, melanoma, glioblastoma — con la piattaforma di terza generazione che ottimizza ogni neoantigen individuale del paziente. I ricavi 2026 sono ancora limitati (€2,0–2,3B previsti) perché l'oncologia personalizzata non è ancora commercializzata, ma la pipeline è la più ampia nel settore mRNA non-COVID. Il vero upside è binario: un'approvazione FDA su anche solo uno dei 3 principali trial farebbe esplodere la valutazione. Il rischio principale è che la finestra di approvazione si sposti oltre il 2028, mettendo sotto pressione il cash.",
     "sector": "Biotech & Gene Therapy", "region": "Europe",
     "initial_price": 105.00, "market_cap": 27.6e9,
     "pe_ratio": 0.0, "eps": -2.50, "dividend_yield": 0.0,
     "roi": -0.04, "roe": -0.08, "target_price": 135.00,
     "risk_level": 7, "beta": 1.53, "revenue": 2.87e9, "ebitda": -0.40e9,
     "annual_performance": -0.18},

    {"ticker": "MRNA", "name": "Moderna Inc.",
     "description": "Moderna è in profonda ristrutturazione post-COVID: perdita netta di $2,8 miliardi nel 2025, cash sceso a $6 miliardi, revenue in calo del 40% a $1,9B. Il titolo è sceso oltre il 90% dai massimi 2021. La scommessa per il 2026-2027 è tutta sul vaccino oncologico personalizzato mRNA-4157 (sviluppato con Merck), attualmente in 8 trial di Fase 2/3 per melanoma e altri tumori solidi. Se i dati di Fase 3 saranno positivi, il titolo ha un upside estremo. Se non arrivano, il cash runway si esaurisce entro 2028. Classico titolo 'all-or-nothing': l'investitore deve scommettere sul paradigma mRNA in oncologia, non sull'azienda come entità stabile.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 35.00, "market_cap": 16.6e9,
     "pe_ratio": 0.0, "eps": -5.90, "dividend_yield": 0.0,
     "roi": -0.12, "roe": -0.20, "target_price": 55.00,
     "risk_level": 8, "beta": 1.80, "revenue": 1.90e9, "ebitda": -2.10e9,
     "annual_performance": -0.40},

    {"ticker": "VRTX", "name": "Vertex Pharmaceuticals",
     "description": "Vertex è il titolo biotech più solido e meno volatile del settore: monopolio assoluto nella fibrosi cistica con tre farmaci approvati (Trikafta, Kaftrio, Orkambi) che coprono il 90% dei pazienti trattabili, revenue 2026 guidance $12,95–13,1B, $12,3 miliardi di cash, nessun debito significativo. La diversificazione include la prima CRISPR therapy approvata al mondo — CASGEVY per anemia falciforme e beta-talassemia, co-sviluppata con CRISPR Therapeutics. Pipeline ulteriore: terapia del dolore (VX-548, senza oppioidi), terapia renale (IgA nephropathy) e diabete tipo 1. La valutazione premium è giustificata dalla visibilità dei ricavi CF e dall'optionality della pipeline. Rischio principale: scadenza dei brevetti CF oltre il 2030 e competizione da generici.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 480.00, "market_cap": 112.0e9,
     "pe_ratio": 25.0, "eps": 19.20, "dividend_yield": 0.0,
     "roi": 0.30, "roe": 0.35, "target_price": 580.00,
     "risk_level": 5, "beta": 0.31, "revenue": 12.0e9, "ebitda": 5.0e9,
     "annual_performance": 0.08},

    {"ticker": "CRSP", "name": "CRISPR Therapeutics AG",
     "description": "CRISPR Therapeutics è l'azienda pure-play di gene editing più liquida quotata al mondo: il suo unico prodotto commerciale è CASGEVY (co-sviluppato con Vertex), la prima terapia CRISPR approvata al mondo, per anemia falciforme e beta-talassemia — al prezzo di $2,2 milioni per trattamento. Revenue quasi zero nel 2025 ($3,5M) perché i centri certificati per la terapia sono ancora pochi e la ramp-up commerciale è lenta. Perdita netta 2025: $581M. Con $1,8B di cash, il runway arriva al 2027-2028. La tesi di investimento è sul gene editing come paradigma: se scala, CRSP è il titolo con il maggiore upside assoluto nel biotech. Pipeline include terapie per beta-talassemia, diabete T1, tumori ematologici via CAR-T.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 34.00, "market_cap": 5.6e9,
     "pe_ratio": 0.0, "eps": -3.50, "dividend_yield": 0.0,
     "roi": -0.50, "roe": -0.80, "target_price": 58.00,
     "risk_level": 9, "beta": 1.70, "revenue": 3.5e6, "ebitda": -0.50e9,
     "annual_performance": -0.15},

    # ══════════════════════════════════════════════════════
    # SETTORE 2 — AI DRUG DISCOVERY
    # ══════════════════════════════════════════════════════

    {"ticker": "RXRX", "name": "Recursion Pharmaceuticals",
     "description": "Recursion è l'azienda AI-native più pura nel drug discovery: integra biologia cellulare ad alto throughput, chimica computazionale, automazione robotica e machine learning in un ciclo unico chiamato 'Recursion OS'. Ha generato il dataset biologico proprietario più grande al mondo — oltre 50PB di dati da 300 milioni di esperimenti cellulari. Revenue TTM $43M, ancora loss-making ($0,21/share loss nel Q4 2025 vs $0,30 atteso). La strategia è l'economia di scala dei dati: più esperimenti → più dati → modelli migliori → pipeline più predittiva. Nel 2026 ha pipeline in Fase 1-2 per neurologia e oncologia rare. Rappresenta la scommessa sul nuovo paradigma della Quarta Scienza — il ciclo ipotesi-test-valida chiuso dall'AI.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 5.00, "market_cap": 2.0e9,
     "pe_ratio": 0.0, "eps": -0.84, "dividend_yield": 0.0,
     "roi": -0.80, "roe": -1.00, "target_price": 9.50,
     "risk_level": 10, "beta": 2.00, "revenue": 43.0e6, "ebitda": -0.30e9,
     "annual_performance": -0.55},

    {"ticker": "SDGR", "name": "Schrödinger Inc.",
     "description": "Schrödinger è il provider di software di simulazione molecolare fisica più usato nel drug discovery: Big Pharma, biotech AI-native e laboratori di ricerca usano la sua piattaforma per simulare come le molecole si legano alle proteine bersaglio, riducendo drasticamente il costo e il tempo dei test wet lab. Due revenue stream: software (ricorrente, ~$200M, in crescita) + drug discovery proprietario (pipeline propria con milestone e royalty future). Perdita netta scesa da $187M a $103M nel 2025. Target EBITDA positivo 2028. Differenziale competitivo: la fisica computazionale reale, non solo il machine learning — le simulazioni di Schrödinger hanno validazione scientifica peer-reviewed. Clienti: Pfizer, BMS, GSK, Takeda, e ora tutti i principali player AI biotech.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 17.00, "market_cap": 0.92e9,
     "pe_ratio": 0.0, "eps": -1.90, "dividend_yield": 0.0,
     "roi": -0.30, "roe": -0.40, "target_price": 28.00,
     "risk_level": 9, "beta": 1.80, "revenue": 255.9e6, "ebitda": -90.0e6,
     "annual_performance": -0.20},

    {"ticker": "ILMN", "name": "Illumina Inc.",
     "description": "Illumina detiene il monopolio nel sequenziamento genomico di nuova generazione (NGS): il 90%+ di tutti i dati genomici prodotti nel mondo passa dai suoi strumenti. È l'infrastruttura invisibile dell'intera industria biotech, AI farmaceutica e diagnostica genomica. Revenue 2026 guidance $4,5–4,6B, stabili. Il modello è hardware + consumabili (reagenti e kit) con margini lordi superiori al 65%. Non è un'azienda ad alta crescita — è un utility genomico: stabile, resiliente, con una posizione competitiva quasi inattaccabile. Beneficia passivamente dalla crescita di tutto il settore AI Drug Discovery perché ogni dato genomico che alimenta i modelli AI passa dai suoi strumenti. Rischio principale: concorrenza di Oxford Nanopore (sequenziamento long-read) per alcune applicazioni.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 95.00, "market_cap": 20.0e9,
     "pe_ratio": 20.0, "eps": 4.75, "dividend_yield": 0.0,
     "roi": 0.15, "roe": 0.10, "target_price": 130.00,
     "risk_level": 6, "beta": 1.40, "revenue": 4.34e9, "ebitda": 0.85e9,
     "annual_performance": -0.10},

    {"ticker": "GOOGL", "name": "Alphabet Inc. (Isomorphic Labs)",
     "description": "Alphabet è inserita nel settore AI Drug Discovery come proxy quotato per Isomorphic Labs — lo spin-off di DeepMind dedicato al drug discovery, che ha raccolto $600M di funding esterno da investitori terzi ad aprile 2025. Isomorphic ha già firmato partnership da miliardi con Novartis ($1,2B) ed Eli Lilly ($1,7B), e sta portando le prime molecole progettate con AlphaFold 3 in trial clinici nel 2026. Il capex complessivo di Alphabet nel 2026 è $175–185B, una quota crescente destinata ad AI biomedico e compute per Isomorphic. Come investimento, GOOGL offre esposizione all'AI farmaceutica con il buffer di sicurezza di $100B+ di cash e $330B di ricavi da Search/YouTube/Cloud. Non è un pure-play, ma è l'unica via quotata per investire direttamente sul ciclo di apprendimento AI in medicina.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 185.00, "market_cap": 2.30e12,
     "pe_ratio": 22.0, "eps": 8.40, "dividend_yield": 0.08,
     "roi": 0.18, "roe": 0.32, "target_price": 220.00,
     "risk_level": 5, "beta": 1.11, "revenue": 380.0e9, "ebitda": 115.0e9,
     "annual_performance": 0.12},

    # ══════════════════════════════════════════════════════
    # SETTORE 3 — ROBOTICS & AUTOMATION
    # ══════════════════════════════════════════════════════

    {"ticker": "ISRG", "name": "Intuitive Surgical Inc.",
     "description": "Intuitive Surgical è il leader assoluto della chirurgia robotica: il sistema da Vinci ha una base installata di oltre 9.000 sistemi in 70 paesi, con crescita procedure del +20,5% nel 2025 e guidance +13–15% per il 2026. Il modello è razor-and-blade: ogni sistema da Vinci genera ricavi ricorrenti da strumentario (ogni strumento va sostituito dopo 10 usi), manutenzione e formazione. Margini lordi >70%, operating margin >30%. Il moat è quasi inviolabile: i chirurghi si formano su da Vinci per anni, creando switching cost cognitivi enormi. Il sistema da Vinci 5 (2024) integra AI per guidance chirurgica e connettività cloud. Pipeline: sistema Ion per biopsia polmonare, espansione nelle procedure ortopediche. Competizione emergente da Medtronic Hugo e CMR Group, ma ISRG ha 10 anni di vantaggio in dati e reputazione.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 530.00, "market_cap": 165.0e9,
     "pe_ratio": 70.0, "eps": 7.57, "dividend_yield": 0.0,
     "roi": 0.15, "roe": 0.18, "target_price": 650.00,
     "risk_level": 5, "beta": 1.68, "revenue": 10.06e9, "ebitda": 3.0e9,
     "annual_performance": 0.18},

    {"ticker": "ABB", "name": "ABB Ltd",
     "description": "ABB è il leader mondiale nell'automazione industriale e nell'elettrificazione: revenue 2025 di $33,22B (+5,4%), margini operativi in miglioramento. Nel 2025 ABB ha venduto la divisione robotica a SoftBank per $5,38B per concentrarsi su electrification (quadri, trasformatori, convertitori) e process automation (sistemi di controllo per industria chimica, oil&gas, mining). Questa focalizzazione la posiziona direttamente come beneficiaria della Dark Factory Mandate europea e di ogni progetto di automazione industriale su larga scala. È stata designata 'strategic industrial asset' dall'UE nel contesto del Fondo per la Sovranità Tech. Dividendo stabile, bilancio solido, esposizione globale bilanciata tra Europa, USA e Asia. Beta basso per il settore — è la scelta difensiva nell'automazione industriale.",
     "sector": "Robotics & Automation", "region": "Europe",
     "initial_price": 55.00, "market_cap": 137.0e9,
     "pe_ratio": 25.0, "eps": 2.20, "dividend_yield": 1.8,
     "roi": 0.12, "roe": 0.20, "target_price": 68.00,
     "risk_level": 4, "beta": 0.90, "revenue": 33.22e9, "ebitda": 5.5e9,
     "annual_performance": 0.15},

    {"ticker": "TER", "name": "Teradyne Inc.",
     "description": "Teradyne è il proxy quotato diretto per l'evento Soglia Cobot: possiede Universal Robots (cobot, $150M+ revenue) e Mobile Industrial Robots (AMR/MiR, robot mobili autonomi). Il business principale è il test automatico di semiconduttori e dispositivi elettronici — ogni chip prodotto al mondo viene testato su strumenti Teradyne. Nel 2026, il segmento robotics è in forte recupero dopo due anni di contrazione ciclica: nuovi contratti 'plan of record' con grandi operatori logistici globali, e il prezzo dei cobot UR in discesa porta la domanda PMI a livelli record. La doppia esposizione (semiconductor test + robotics) crea una correlazione diretta con i due mega-trend più importanti del gioco. Rischio: ciclicità del mercato semiconductor test, che può comprimere i margini nei down-cycle.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 120.00, "market_cap": 20.0e9,
     "pe_ratio": 38.0, "eps": 3.16, "dividend_yield": 0.6,
     "roi": 0.18, "roe": 0.25, "target_price": 155.00,
     "risk_level": 6, "beta": 1.50, "revenue": 3.19e9, "ebitda": 0.75e9,
     "annual_performance": 0.10},

    {"ticker": "ROK", "name": "Rockwell Automation",
     "description": "Rockwell Automation fornisce il 'sistema nervoso' di ogni impianto manifatturiero automatizzato: PLC (controllori logici programmabili), sistemi SCADA, software MES e piattaforme IIoT per l'industria connessa. Non produce robot, ma fornisce il software e l'infrastruttura di controllo che fa funzionare l'intera fabbrica — inclusi i robot di altri vendor. Beneficia della Dark Factory Mandate senza il rischio hardware di chi produce i robot. Il platform software FactoryTalk è usato da oltre 28.000 impianti globali, creando switching cost elevatissimi. Revenue 2025 $8,57B, in stabilizzazione dopo un 2024 difficile. Margini operativi superiori al 20%. La tesi di investimento è sulla convergenza IT/OT (Information Technology + Operational Technology) come megatrend irreversibile.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 280.00, "market_cap": 32.5e9,
     "pe_ratio": 28.0, "eps": 10.00, "dividend_yield": 2.5,
     "roi": 0.20, "roe": 0.50, "target_price": 345.00,
     "risk_level": 5, "beta": 1.00, "revenue": 8.57e9, "ebitda": 2.0e9,
     "annual_performance": 0.05},

    # ══════════════════════════════════════════════════════
    # SETTORE 4 — SEMICONDUCTOR & AI INFRA
    # ══════════════════════════════════════════════════════

    {"ticker": "NVDA", "name": "NVIDIA Corp.",
     "description": "NVIDIA è il titolo centrale dell'era AI: revenue FY2026 di $197,3B (di cui 91% data center), net income $72,9B, margini lordi >74%. I chip Blackwell (H200, B100, B200) sono ausati da tutti i principali hyperscaler per addestrare e fare inferenza sui modelli AI di frontiera. Il vantaggio competitivo non è solo hardware — è CUDA, la piattaforma software sviluppata per 15 anni che ha creato un ecosistema di milioni di sviluppatori, framework (PyTorch, TensorFlow) e librerie ottimizzate che rendono il cambio di fornitore molto costoso. Beta 2.38 — il titolo più volatile del portafoglio, massima sensibilità a qualsiasi evento che impatti l'AI. Rischi: concentrazione clienti (Microsoft, Google, Amazon, Meta = grande quota revenue), sviluppo chip custom dai clienti, restrizioni export Cina.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 165.00, "market_cap": 4.04e12,
     "pe_ratio": 55.0, "eps": 3.00, "dividend_yield": 0.03,
     "roi": 0.55, "roe": 1.10, "target_price": 200.00,
     "risk_level": 7, "beta": 2.38, "revenue": 197.3e9, "ebitda": 95.0e9,
     "annual_performance": 1.10},

    {"ticker": "INTC", "name": "Intel Corp.",
     "description": "Intel è la storia di un underdog in cerca di riscatto: dopo anni di ritardi tecnologici e perdite di quote di mercato a favore di TSMC e AMD, nel 2026 lancia Loihi 3 — un chip neuromorfico a 4nm con 8 milioni di neuroni e 64 miliardi di sinapsi per chip, capace di elaborare task di inferenza con efficienza energetica 10-1.000x superiore alle GPU tradizionali. Intel è l'unica grande azienda quotata con un roadmap neuromorfico commerciale avanzato. Se questo paradigma decolla, Intel può disruppare NVIDIA. Se non decolla, è un'azienda in perdita ($0,38 EPS negativo nel 2025) con un processo produttivo ancora indietro rispetto a TSMC. Il titolo ha un profilo asimmetrico: limitato downside (già scontato), enorme upside condizionale. Dividendo azzerato nel 2024 per finanziare il turnaround.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 22.00, "market_cap": 95.0e9,
     "pe_ratio": 0.0, "eps": -0.38, "dividend_yield": 0.0,
     "roi": -0.01, "roe": -0.02, "target_price": 35.00,
     "risk_level": 7, "beta": 1.20, "revenue": 54.0e9, "ebitda": 7.0e9,
     "annual_performance": -0.25},

    {"ticker": "AVGO", "name": "Broadcom Inc.",
     "description": "Broadcom è l'alternativa strutturale a NVIDIA per chi vuole esposizione all'AI infra senza il rischio GPU-singolo: detiene il 90% del mercato degli ASIC custom (chip AI progettati ad hoc per il cliente specifico). Co-sviluppa il TPU di Google, il chip custom di Meta e chip per Apple. Backlog AI chips da $73 miliardi per i prossimi 18 mesi. Free cash flow $26,9B — uno dei FCF più alti nel settore tech. Revenue 2025 $64B (+24%), con guidance di crescita sostenuta. L'acquisizione di VMware (2023, $69B) ha trasformato Broadcom anche in un leader dell'infrastruttura cloud enterprise. La differenza con NVIDIA: mentre NVIDIA vende GPU standard a molti clienti, Broadcom lavora su chip dedicati — meno volatilità, margini più stabili, legami più profondi con i clienti.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 200.00, "market_cap": 1.88e12,
     "pe_ratio": 40.0, "eps": 5.00, "dividend_yield": 1.8,
     "roi": 0.20, "roe": 0.50, "target_price": 240.00,
     "risk_level": 6, "beta": 1.26, "revenue": 64.0e9, "ebitda": 35.0e9,
     "annual_performance": 0.50},

    {"ticker": "ASML", "name": "ASML Holding NV",
     "description": "ASML è il monopolio assoluto nella litografia EUV: il 94% del market share globale, senza le sue macchine nessun chip avanzato sotto i 3nm può essere prodotto al mondo. Revenue 2025 €32,7B (+15,6%), guidance 2026 €34–39B. Ogni macchina EUV High-NA costa oltre €350 milioni e richiede 3 anni di lead time. I clienti principali — TSMC, Samsung, Intel — dipendono da ASML per mantenere la roadmap tecnologica. È stata citata esplicitamente nel corso STF come eccezione al gap tecnologico europeo (la sola azienda EU in posizione di monopolio tecnologico globale). Le restrizioni all'export verso la Cina (imposte dal governo olandese sotto pressione USA) hanno tolto il 15% del mercato potenziale ma non hanno impattato significativamente la crescita, dato che la domanda da TSMC e Samsung copre abbondantemente la capacità produttiva.",
     "sector": "Semiconductor & AI Infra", "region": "Europe",
     "initial_price": 800.00, "market_cap": 335.0e9,
     "pe_ratio": 45.0, "eps": 17.78, "dividend_yield": 0.6,
     "roi": 0.26, "roe": 0.49, "target_price": 980.00,
     "risk_level": 6, "beta": 1.43, "revenue": 39.0e9, "ebitda": 14.0e9,
     "annual_performance": 0.15},

    # ══════════════════════════════════════════════════════
    # SETTORE 5 — NUCLEAR & CLEAN ENERGY
    # ══════════════════════════════════════════════════════

    {"ticker": "CEG", "name": "Constellation Energy Corp.",
     "description": "Constellation Energy è il più grande produttore di energia nucleare degli USA con 31.676 MW di capacità installata — circa il 10% dell'intera generazione elettrica americana. Nel 2026 ha firmato Power Purchase Agreement (PPA) con Microsoft, Google e altri hyperscaler AI per fornire energia nucleare a basse emissioni direttamente ai loro data center. Questi contratti pluriennali a prezzo fisso garantiscono visibilità dei ricavi senza precedenti nel settore utility. Con la crisi del Muro dell'Energia (data center che consumano il 19% dell'elettricità globale), Constellation è diventata un asset strategico per l'economia dell'AI: l'unica fonte in grado di fornire potenza H24 stabile e scalabile in grado di alimentare un data center di grandi dimensioni. Revenue 2025 $25,53B (+8,3%), EBITDA in crescita.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 300.00, "market_cap": 94.5e9,
     "pe_ratio": 35.0, "eps": 8.57, "dividend_yield": 1.0,
     "roi": 0.15, "roe": 0.20, "target_price": 390.00,
     "risk_level": 5, "beta": 0.70, "revenue": 25.53e9, "ebitda": 4.5e9,
     "annual_performance": 0.55},

    {"ticker": "VST", "name": "Vistra Corp.",
     "description": "Vistra è il player energetico più diversificato del portafoglio: 44.000 MW di capacità installata con mix nucleare + gas + solare + battery storage. Nel 2026 ha firmato un PPA da 1.200 MW con un grande operatore di data center AI per 20 anni. EBITDA 2026 guidance $6,8–7,6B. La diversificazione del portfolio energetico è il differenziale rispetto a Constellation: mentre CEG è 100% nucleare, Vistra può ottimizzare il dispatch tra nucleare, gas e rinnovabili in base al prezzo di mercato dell'elettricità, catturando spread di arbitraggio. Il business di stoccaggio in batterie (370 MW operativi nel 2026) le dà anche flessibilità per servire la rete in momenti di picco. Rischio principale: maggiore esposizione ai prezzi spot dell'elettricità rispetto a CEG.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 155.00, "market_cap": 51.2e9,
     "pe_ratio": 30.0, "eps": 5.17, "dividend_yield": 0.8,
     "roi": 0.10, "roe": 0.25, "target_price": 200.00,
     "risk_level": 6, "beta": 0.80, "revenue": 17.74e9, "ebitda": 6.0e9,
     "annual_performance": 0.45},

    {"ticker": "OKLO", "name": "Oklo Inc.",
     "description": "Oklo è il titolo più speculativo del portafoglio: sviluppa micro-reattori nucleari di quarta generazione (Aurora Powerhouse, 15-50 MW) per alimentare data center, basi militari e siti industriali remoti. Revenue: praticamente zero (meno di $1M), primo reattore in costruzione in Idaho previsto per il 2027. Market cap $9,9B — interamente basato su aspettative future. I fondatori vengono da OpenAI (il CEO Sam Altman è stato co-fondatore e investitore). I potenziali clienti includono Microsoft, Google e il Dipartimento della Difesa USA. La proposta di valore è unica: energia nucleare in moduli da 50 MW installabili in 18 mesi, contro 10-15 anni di un reattore tradizionale. Se la tecnologia SMR decolla nei prossimi anni, OKLO è l'upside più estremo del settore. Se slittano i permessi o emergono problemi tecnici, il cash si esaurisce.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 55.00, "market_cap": 9.9e9,
     "pe_ratio": 0.0, "eps": -0.30, "dividend_yield": 0.0,
     "roi": 0.0, "roe": 0.0, "target_price": 85.00,
     "risk_level": 10, "beta": 2.50, "revenue": 0.5e6, "ebitda": -50.0e6,
     "annual_performance": -0.10},

    {"ticker": "CCJ", "name": "Cameco Corp.",
     "description": "Cameco è il secondo produttore mondiale di uranio con il 15% della produzione globale, operazioni primarie in Canada (Cigar Lake, McArthur River) e Kazakhstan. È la commodity play diretta sull'espansione nucleare: ogni scenario di crescita del nucleare — SMR, nuovi reattori convenzionali, riattivazione di impianti esistenti, data center AI — si traduce in domanda di uranio. Uranium spot price aprile 2026: $84,25/lb, con previsioni Citi di $100–125/lb entro 2027 sulla scia della politica energetica post-Muro dell'Energia. A differenza di OKLO (speculative pre-revenue) e CEG/VST (utility operative), Cameco è il pick-and-shovel play: non dipende dal successo di un singolo progetto, ma dal trend strutturale di lungo termine verso l'energia nucleare come componente essenziale del mix energetico per AI e decarbonizzazione.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 50.00, "market_cap": 19.7e9,
     "pe_ratio": 40.0, "eps": 1.25, "dividend_yield": 0.3,
     "roi": 0.06, "roe": 0.08, "target_price": 65.00,
     "risk_level": 7, "beta": 0.90, "revenue": 2.9e9, "ebitda": 0.9e9,
     "annual_performance": 0.20},

    # ══════════════════════════════════════════════════════
    # SETTORE 6 — HEALTHCARE SYSTEMS
    # ══════════════════════════════════════════════════════

    {"ticker": "UNH", "name": "UnitedHealth Group Inc.",
     "description": "UnitedHealth è il più grande assicuratore sanitario USA con $447,56B di revenue TTM — la quinta azienda per ricavi al mondo. Ma il 2025 è stato devastante: perdita operativa di $278M (vs +$7,8B nel 2024) per la combinazione di tagli ai rimborsi Medicare Advantage, inflazione dei costi medici e l'impatto della violazione informatica di Change Healthcare. Il titolo ha perso il 35% da gennaio 2025. UNH è il caso di studio perfetto del paradosso difensivo: un'azienda enorme non è necessariamente sicura — i rischi regolatori e i cicli di rimborso Medicare possono distruggere i margini nonostante la scala. Per il 2026, il mercato sta prezzando una normalizzazione dei costi medici e un recupero del loss operativo. Il dividendo rimane stabile. Beta 0.38 — nonostante la crisi, il titolo si muove poco rispetto al mercato.",
     "sector": "Healthcare Systems", "region": "USA",
     "initial_price": 280.00, "market_cap": 258.7e9,
     "pe_ratio": 0.0, "eps": -0.30, "dividend_yield": 1.7,
     "roi": -0.01, "roe": -0.02, "target_price": 360.00,
     "risk_level": 6, "beta": 0.38, "revenue": 447.56e9, "ebitda": 25.0e9,
     "annual_performance": -0.35},

    {"ticker": "LLY", "name": "Eli Lilly and Co.",
     "description": "Eli Lilly è l'azienda farmaceutica in più rapida crescita al mondo nel 2025-2026: revenue +45% a $65,2B, trainati dai farmaci GLP-1 per obesità e diabete — Mounjaro ($23B) e Zepbound ($13,5B) che insieme dominano il 60% del mercato weight-loss globale. La guidance 2026 è $80–83B. Ha firmato un deal da $2,75B con Insilico Medicine per 28 farmaci AI-generati e ha un co-laboratorio con NVIDIA per accelerare il drug discovery. Lilly è il caso paradigmatico di una Big Pharma che ha abbracciato l'AI per mantenere la leadership: ha costruito impianti produttivi in USA, Europa e Asia per scalare la produzione di semaglutide e tirzepatide, con capex miliardari annui. Rischio principale: scadenza dei brevetti GLP-1 e competizione da Novo Nordisk (Ozempic/Wegovy). Beta bassissimo nonostante la crescita esplosiva.",
     "sector": "Healthcare Systems", "region": "USA",
     "initial_price": 850.00, "market_cap": 807.5e9,
     "pe_ratio": 55.0, "eps": 15.45, "dividend_yield": 0.6,
     "roi": 0.25, "roe": 0.60, "target_price": 1100.00,
     "risk_level": 6, "beta": 0.43, "revenue": 65.2e9, "ebitda": 22.0e9,
     "annual_performance": 0.30},

    {"ticker": "AZN", "name": "AstraZeneca PLC",
     "description": "AstraZeneca è la Big Pharma con il target più ambizioso del settore: $80B di revenue entro il 2030 (vs $55B attuali), guidata da un portfolio oncologico di 28 prodotti in commercio e una pipeline con 180 molecole in sviluppo. Crescita EPS +45,3% nel 2025, revenue +20% a £42,48B. L'oncologia AI-driven è il driver principale: partnership con Isomorphic Labs, Recursion e altri per integrare il drug discovery computazionale nella pipeline. Presenza in 130+ paesi e 28 impianti produttivi globali la rendono resiliente alle interruzioni di supply chain. AZN è la rappresentazione di cosa succede quando una Big Pharma europea abbraccia l'AI sistematicamente — non come sperimentazione, ma come motore dell'intera pipeline. Defensive nella struttura (beta 0.23) ma con uno dei migliori profili di crescita nel settore pharma tradizionale.",
     "sector": "Healthcare Systems", "region": "Europe",
     "initial_price": 73.00, "market_cap": 113.0e9,
     "pe_ratio": 25.0, "eps": 2.92, "dividend_yield": 2.5,
     "roi": 0.15, "roe": 0.20, "target_price": 92.00,
     "risk_level": 5, "beta": 0.23, "revenue": 55.0e9, "ebitda": 15.0e9,
     "annual_performance": 0.12},

    {"ticker": "MDT", "name": "Medtronic PLC",
     "description": "Medtronic è il proxy per la convergenza tra healthcare tradizionale e robotica: il suo sistema Hugo di chirurgia robotica è in attesa di FDA clearance per urologia (prevista 2026) e ha già approvazione CE. Revenue 2025 $35,5B (+6,9%), con 4 aree di crescita identificate a $1B+ ciascuna: neuroscienze (stimolazione cerebrale), cardiovascolare (TAVR), diabetes (closed-loop insulin delivery) e chirurgia robotica. Il vantaggio competitivo è la relazione con 100.000+ cardiologi, neurologi e chirurghi nel mondo che usano strumenti Medtronic quotidianamente — switching cost enormi basati sulla familiarità clinica. Il beta più basso del settore Robotics (0.55): è il modo difensivo di investire nella chirurgia robotica. Competizione crescente da ISRG (da Vinci dominante) e startup emergenti.",
     "sector": "Healthcare Systems", "region": "Europe",
     "initial_price": 82.00, "market_cap": 109.9e9,
     "pe_ratio": 20.0, "eps": 4.10, "dividend_yield": 3.5,
     "roi": 0.08, "roe": 0.12, "target_price": 102.00,
     "risk_level": 4, "beta": 0.55, "revenue": 35.5e9, "ebitda": 8.5e9,
     "annual_performance": 0.03},

    # ══════════════════════════════════════════════════════
    # SETTORE 7 — LOGISTICS & SUPPLY CHAIN
    # ══════════════════════════════════════════════════════

    {"ticker": "UPS", "name": "United Parcel Service Inc.",
     "description": "UPS gestisce il 20–23% del volume parcel USA con 500.000+ dipendenti e una rete di 100.000+ veicoli di consegna. Il titolo rappresenta la logistica difensiva: stabile, generatrice di cash, con un dividendo tra i più alti del settore. Ma il 2025 è stato difficile: calo dei volumi post-COVID, rinnovo contrattuale Teamsters con aumenti salariali pesanti, e perdita di contratti Amazon (che sta verticalizzando la logistica con la propria rete da 6 miliardi di pacchi annui). Investimenti in automazione accelerati ma ancora insufficienti per recuperare il gap competitivo. UPS è il titolo più difensivo della categoria Logistics, ma ha il maggiore rischio di disruption strutturale da parte dei tech player. Dividendo yield >5% — uno dei più alti nel portafoglio.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 100.00, "market_cap": 85.5e9,
     "pe_ratio": 15.0, "eps": 6.67, "dividend_yield": 5.2,
     "roi": 0.15, "roe": 0.50, "target_price": 120.00,
     "risk_level": 4, "beta": 1.05, "revenue": 90.9e9, "ebitda": 9.5e9,
     "annual_performance": -0.12},

    {"ticker": "FDX", "name": "FedEx Corp.",
     "description": "FedEx ha superato UPS in capitalizzazione di mercato per la prima volta a marzo 2026, dopo anni di ristrutturazione. Il piano Network 2.0 è la scommessa operativa: consolidare Express e Ground in rete unica, chiudere 475+ hub obsoleti, ridurre i costi di pickup del 10%. Partnership con il Dipartimento dell'Energia USA per furgoni a idrogeno in California. Revenue ~$88B, margini in miglioramento strutturale. FedEx è il 'turnaround play' della logistica: chi crede nella ristrutturazione ha un upside significativo; chi non ci crede vede solo costi di taglio e ricavi stabili. La differenza con UPS: FedEx ha meno esposizione ai sindacati e più flessibilità operativa nel breve termine. Dividend yield modesto ma stabile.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 320.00, "market_cap": 78.4e9,
     "pe_ratio": 18.0, "eps": 17.78, "dividend_yield": 2.5,
     "roi": 0.10, "roe": 0.20, "target_price": 390.00,
     "risk_level": 5, "beta": 1.28, "revenue": 88.0e9, "ebitda": 7.5e9,
     "annual_performance": 0.05},

    {"ticker": "AMZN", "name": "Amazon.com Inc.",
     "description": "Amazon è la logistica più grande al mondo mascherata da tech company: 6,1 miliardi di pacchi consegnati nel 2024, superando USPS come primo carrier USA. 750.000+ robot Kiva nei warehouse. Revenue stimata FY2025 $638B. Ma il driver principale del valore è AWS — cloud computing, 31% di market share globale, >60% dell'operating income totale. Nel contesto del gioco, Amazon è inserita nella Logistics per la sua posizione dominante nella supply chain fisica (robot, hub, consegne), ma è anche un proxy diretto per l'AI infra (AWS) e il commercio globale. Ogni evento di Soglia Cobot, Dark Factory o disruption logistica la colpisce direttamente nei suoi 1.000+ warehouse. Ogni evento che accelera l'AI infra la beneficia via AWS. Il titolo con il maggior numero di correlazioni nel portafoglio.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 215.00, "market_cap": 2.31e12,
     "pe_ratio": 32.0, "eps": 6.72, "dividend_yield": 0.0,
     "roi": 0.09, "roe": 0.21, "target_price": 255.00,
     "risk_level": 7, "beta": 1.42, "revenue": 638.0e9, "ebitda": 90.0e9,
     "annual_performance": 0.22},

    {"ticker": "XPO", "name": "XPO Inc.",
     "description": "XPO è lo specialista LTL (less-than-truckload) con forte componente AI nell'ottimizzazione dei percorsi e nel pricing dinamico. Revenue TTM $8,15B, più esposta ai cicli industriali rispetto a UPS/FDX ma con maggiore leva operativa — quando i volumi crescono, i margini crescono più velocemente. XPO beneficia direttamente dal reshoring manifatturiero e dalla Dark Factory Mandate: le fabbriche che si automatizzano in Europa e USA hanno bisogno di movimentare componenti e prodotti finiti via LTL. La componente AI nel pricing le dà un vantaggio competitivo sulla marginalità rispetto ai player tradizionali. È il titolo più ciclico e più speculativo del settore logistica: massima leva operativa, quindi massimo upside nei cicli positivi e massimo rischio nei downturn.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 135.00, "market_cap": 15.1e9,
     "pe_ratio": 35.0, "eps": 3.86, "dividend_yield": 0.0,
     "roi": 0.08, "roe": 0.15, "target_price": 170.00,
     "risk_level": 7, "beta": 1.50, "revenue": 8.15e9, "ebitda": 1.2e9,
     "annual_performance": 0.10},

    # ══════════════════════════════════════════════════════
    # SETTORE 8 — FOOD & AGRITECH
    # ══════════════════════════════════════════════════════

    {"ticker": "DE", "name": "John Deere & Co.",
     "description": "John Deere è il leader mondiale nelle macchine agricole autonome e nel precision farming: ogni trattore di nuova generazione ha GPS centimetrico, sensori multispettrali, computer vision e può operare in modalità completamente autonoma. Revenue 2025 $45,7B (-11,7%) per il ciclo basso del settore agricolo, ma Q1 2026 +13% YoY segnala il recupero. Il sistema operativo JDLink connette 500.000+ macchine in campo in tempo reale, generando dati agronomici che Deere monetizza con servizi software a valore aggiunto. È il beneficiario diretto dell'evento ZeroFarm: se le vertical farm si espandono, servono robot di raccolta e sistemi di automazione — Deere è il brand con la tecnologia e il canale per fornirli. Anche beneficia dal Paradosso Risolto: robot che operano in campo aperto erano impossibili senza navigazione in ambienti non strutturati.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 430.00, "market_cap": 123.4e9,
     "pe_ratio": 22.0, "eps": 19.55, "dividend_yield": 2.5,
     "roi": 0.18, "roe": 0.42, "target_price": 530.00,
     "risk_level": 5, "beta": 0.96, "revenue": 45.7e9, "ebitda": 8.5e9,
     "annual_performance": -0.12},

    {"ticker": "CTVA", "name": "Corteva Inc.",
     "description": "Corteva — spin-off di DowDuPont — è il provider dell'OS dell'agricoltura moderna: sementi geneticamente ottimizzate (Pioneer) + protezione colture (Mycogen, Brevant) + software di precision agriculture (Granular). Revenue 2025 $17,4B (+2,9%), consensus 2026 +4,4% vendite e +7,2% EPS. È l'azienda che vende l'infrastruttura digitale delle decisioni agronomiche: quale seme piantare, quando irrigare, quando e quanto trattare, ottimizzato per massimizzare la resa per ettaro. Beneficia sia dall'automazione agricola (i robot agricoli usano i dati di Corteva per prendere decisioni) sia dalla pressione climatica sui raccolti (le sue sementi resistenti alla siccità diventano più preziose). Rischio principale: brevetti sulle sementi OGM sotto scrutinio regolatorio in Europa.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 65.00, "market_cap": 46.3e9,
     "pe_ratio": 22.0, "eps": 2.95, "dividend_yield": 1.0,
     "roi": 0.10, "roe": 0.12, "target_price": 80.00,
     "risk_level": 5, "beta": 0.85, "revenue": 17.4e9, "ebitda": 3.2e9,
     "annual_performance": 0.03},

    {"ticker": "AGCO", "name": "AGCO Corp.",
     "description": "AGCO produce macchine agricole premium per l'automazione: Fendt (brand premium europeo con i trattori autonomi più avanzati d'Europa), Massey Ferguson e Challenger. Revenue 2025 $10,1B (-13,5%) per il ciclo basso del settore, con guidance 2026 $10,4–10,7B. Fendt è considerato il Ferrari dei trattori agricoli: completamente autonomo, integrato con sistemi di navigazione da satellite, telecamere 360° e AI per il riconoscimento delle colture. In Europa, Fendt ha il 25%+ di market share nel segmento premium, con margini più alti del segmento budget. AGCO è più piccola e più volatile di Deere — più esposta al ciclo agricolo europeo — ma con maggiore upside se l'automazione agricola accelera in Europa (dove si concentra il business Fendt).",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 100.00, "market_cap": 6.7e9,
     "pe_ratio": 12.0, "eps": 8.33, "dividend_yield": 1.5,
     "roi": 0.06, "roe": 0.10, "target_price": 130.00,
     "risk_level": 6, "beta": 1.00, "revenue": 10.1e9, "ebitda": 0.8e9,
     "annual_performance": -0.15},

    {"ticker": "ADM", "name": "Archer Daniels Midland Co.",
     "description": "ADM è il più grande trader e processore di commodity agricole al mondo: soia, mais, frumento, semi oleosi — il 60%+ del commercio globale passa attraverso la sua rete di elevatori, terminal portuali e impianti di trasformazione. Revenue ~$80B ma margini bassissimi (trading commodity). Il 2024 è stato devastante: scandalo contabile che ha portato il CFO alle dimissioni, indagine SEC, market cap dimezzato. Nel 2026 è in fase di recupero della fiducia degli investitori, con nuovo management e audit interno completato. La tesi di investimento è contrarian: se ZeroFarm si afferma e la produzione alimentare aumenta (più volume da processare), ADM beneficia indipendentemente dalla fonte. Ma se le filiere si accorciano (vertical farm urbane → distribuzione locale), perde volumi sui contratti di lunga distanza.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 60.00, "market_cap": 25.7e9,
     "pe_ratio": 12.0, "eps": 5.00, "dividend_yield": 3.0,
     "roi": 0.05, "roe": 0.08, "target_price": 80.00,
     "risk_level": 5, "beta": 0.70, "revenue": 80.0e9, "ebitda": 2.5e9,
     "annual_performance": -0.25},

]
```

---

## Note
- **Non modificare** nessun'altra parte del file (`import`, `main()`, logica di seeding).
- I settori usati (`sector`) devono corrispondere esattamente ai nomi in `database/baseline_data.py`.
- Il campo `region` accetta solo: `"USA"`, `"Europe"`, `"Asia"`.
- Nota: `GOOGL` è ora nel settore `"AI Drug Discovery"` (non più `"Tech"`) perché nel contesto del gioco è il proxy per Isomorphic Labs.
- Nota: `AMZN` è ora nel settore `"Logistics & Supply Chain"` (non più `"Tech"`) per rispecchiare il focus sulla logistica fisica.
- Nota: `ASML` rimane in `"Semiconductor & AI Infra"` (non più `"Tech"`).
- Dopo aver aggiornato questo file, esegui `python -m database.seed` dalla root per popolare il database. **Prima** assicurati che `database/events_data.py` sia già aggiornato (seed.py importa da lì).
