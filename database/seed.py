"""
Seed script - Popola il database con dati iniziali.

Esegui con: python -m database.seed (dalla root del progetto)

Crea:
- 61 titoli reali distribuiti per settore
- Variabili interne per ogni titolo (12 variabili a 50.0)
- Alcuni giocatori di test
"""

import sys
import os

# Aggiungi la root del progetto al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.persistence.database import init_db, get_db
from backend.persistence import repositories as repo
from database.events_data import INTERNAL_VARIABLES

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
     "initial_price": 105.00, "market_cap": 2.5e10,
     "pe_ratio": -19.30, "eps": -2.50, "dividend_yield": 0.0,
     "roi": -0.1690, "roe": -0.0670, "target_price": 135.00,
     "risk_level": 7, "beta": 1.37, "revenue": 2.8e09, "ebitda": -1.2e09,
     "annual_performance": 0.0545},

    {"ticker": "MRNA", "name": "Moderna Inc.",
     "description": "Moderna è in profonda ristrutturazione post-COVID: perdita netta di $2,8 miliardi nel 2025, cash sceso a $6 miliardi, revenue in calo del 40% a $1,9B. Il titolo è sceso oltre il 90% dai massimi 2021. La scommessa per il 2026-2027 è tutta sul vaccino oncologico personalizzato mRNA-4157 (sviluppato con Merck), attualmente in 8 trial di Fase 2/3 per melanoma e altri tumori solidi. Se i dati di Fase 3 saranno positivi, il titolo ha un upside estremo. Se non arrivano, il cash runway si esaurisce entro 2028. Classico titolo 'all-or-nothing': l'investitore deve scommettere sul paradigma mRNA in oncologia, non sull'azienda come entità stabile.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 35.00, "market_cap": 1.9e10,
     "pe_ratio": -4.48, "eps": -5.90, "dividend_yield": 0.0,
     "roi": -0.2620, "roe": -0.3660, "target_price": 55.00,
     "risk_level": 8, "beta": 1.06, "revenue": 2.2e09, "ebitda": -2.3e09,
     "annual_performance": 0.1422},

    {"ticker": "VRTX", "name": "Vertex Pharmaceuticals",
     "description": "Vertex è il titolo biotech più solido e meno volatile del settore: monopolio assoluto nella fibrosi cistica con tre farmaci approvati (Trikafta, Kaftrio, Orkambi) che coprono il 90% dei pazienti trattabili, revenue 2026 guidance $12,95–13,1B, $12,3 miliardi di cash, nessun debito significativo. La diversificazione include la prima CRISPR therapy approvata al mondo — CASGEVY per anemia falciforme e beta-talassemia, co-sviluppata con CRISPR Therapeutics. Pipeline ulteriore: terapia del dolore (VX-548, senza oppioidi), terapia renale (IgA nephropathy) e diabete tipo 1. La valutazione premium è giustificata dalla visibilità dei ricavi CF e dall'optionality della pipeline. Rischio principale: scadenza dei brevetti CF oltre il 2030 e competizione da generici.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 480.00, "market_cap": 1.1e11,
     "pe_ratio": 29.85, "eps": 19.20, "dividend_yield": 0.0,
     "roi": 0.2450, "roe": 0.2420, "target_price": 580.00,
     "risk_level": 5, "beta": 0.30, "revenue": 1.2e10, "ebitda": 5.0e09,
     "annual_performance": 0.3810},

    {"ticker": "CRSP", "name": "CRISPR Therapeutics AG",
     "description": "CRISPR Therapeutics è l'azienda pure-play di gene editing più liquida quotata al mondo: il suo unico prodotto commerciale è CASGEVY (co-sviluppato con Vertex), la prima terapia CRISPR approvata al mondo, per anemia falciforme e beta-talassemia — al prezzo di $2,2 milioni per trattamento. Revenue quasi zero nel 2025 ($3,5M) perché i centri certificati per la terapia sono ancora pochi e la ramp-up commerciale è lenta. Perdita netta 2025: $581M. Con $1,8B di cash, il runway arriva al 2027-2028. La tesi di investimento è sul gene editing come paradigma: se scala, CRSP è il titolo con il maggiore upside assoluto nel biotech. Pipeline include terapie per beta-talassemia, diabete T1, tumori ematologici via CAR-T.",
     "sector": "Biotech & Gene Therapy", "region": "USA",
     "initial_price": 34.00, "market_cap": 5.2e09,
     "pe_ratio": -7.98, "eps": -3.50, "dividend_yield": 0.0,
     "roi": -0.3150, "roe": -0.3120, "target_price": 58.00,
     "risk_level": 9, "beta": 1.74, "revenue": 4.1e06, "ebitda": -5.3e08,
     "annual_performance": 0.3684},

    # ══════════════════════════════════════════════════════
    # SETTORE 2 — AI DRUG DISCOVERY
    # ══════════════════════════════════════════════════════

    {"ticker": "RXRX", "name": "Recursion Pharmaceuticals",
     "description": "Recursion è l'azienda AI-native più pura nel drug discovery: integra biologia cellulare ad alto throughput, chimica computazionale, automazione robotica e machine learning in un ciclo unico chiamato 'Recursion OS'. Ha generato il dataset biologico proprietario più grande al mondo — oltre 50PB di dati da 300 milioni di esperimenti cellulari. Revenue TTM $43M, ancora loss-making ($0,21/share loss nel Q4 2025 vs $0,30 atteso). La strategia è l'economia di scala dei dati: più esperimenti → più dati → modelli migliori → pipeline più predittiva. Nel 2026 ha pipeline in Fase 1-2 per neurologia e oncologia rare. Rappresenta la scommessa sul nuovo paradigma della Quarta Scienza — il ciclo ipotesi-test-valida chiuso dall'AI.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 5.00, "market_cap": 1.9e09,
     "pe_ratio": -1.92, "eps": -0.84, "dividend_yield": 0.0,
     "roi": -0.2770, "roe": -0.5720, "target_price": 9.50,
     "risk_level": 10, "beta": 1.05, "revenue": 6.6e07, "ebitda": -5.0e08,
     "annual_performance": -0.6038},

    {"ticker": "SDGR", "name": "Schrödinger Inc.",
     "description": "Schrödinger è il provider di software di simulazione molecolare fisica più usato nel drug discovery: Big Pharma, biotech AI-native e laboratori di ricerca usano la sua piattaforma per simulare come le molecole si legano alle proteine bersaglio, riducendo drasticamente il costo e il tempo dei test wet lab. Due revenue stream: software (ricorrente, ~$200M, in crescita) + drug discovery proprietario (pipeline propria con milestone e royalty future). Perdita netta scesa da $187M a $103M nel 2025. Target EBITDA positivo 2028. Differenziale competitivo: la fisica computazionale reale, non solo il machine learning — le simulazioni di Schrödinger hanno validazione scientifica peer-reviewed. Clienti: Pfizer, BMS, GSK, Takeda, e ora tutti i principali player AI biotech.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 17.00, "market_cap": 9.6e08,
     "pe_ratio": -9.46, "eps": -1.90, "dividend_yield": 0.0,
     "roi": -0.3100, "roe": -0.3010, "target_price": 28.00,
     "risk_level": 9, "beta": 1.58, "revenue": 2.5e08, "ebitda": -1.6e08,
     "annual_performance": 0.1035},

    {"ticker": "ILMN", "name": "Illumina Inc.",
     "description": "Illumina detiene il monopolio nel sequenziamento genomico di nuova generazione (NGS): il 90%+ di tutti i dati genomici prodotti nel mondo passa dai suoi strumenti. È l'infrastruttura invisibile dell'intera industria biotech, AI farmaceutica e diagnostica genomica. Revenue 2026 guidance $4,5–4,6B, stabili. Il modello è hardware + consumabili (reagenti e kit) con margini lordi superiori al 65%. Non è un'azienda ad alta crescita — è un utility genomico: stabile, resiliente, con una posizione competitiva quasi inattaccabile. Beneficia passivamente dalla crescita di tutto il settore AI Drug Discovery perché ogni dato genomico che alimenta i modelli AI passa dai suoi strumenti. Rischio principale: concorrenza di Oxford Nanopore (sequenziamento long-read) per alcune applicazioni.",
     "sector": "AI Drug Discovery", "region": "USA",
     "initial_price": 95.00, "market_cap": 2.2e10,
     "pe_ratio": 25.11, "eps": 4.75, "dividend_yield": 0.0,
     "roi": 0.2240, "roe": 0.3380, "target_price": 130.00,
     "risk_level": 6, "beta": 1.42, "revenue": 4.4e09, "ebitda": 1.2e09,
     "annual_performance": 0.8038},

    {"ticker": "GOOGL", "name": "Alphabet Inc. (Google)",
     "description": "Alphabet, la società madre di Google, è il gigante globale dell'AI con DeepMind che guida la ricerca in drug discovery (AlphaFold), robotica e AGI. Google Cloud è la terza piattaforma cloud mondiale e il motore di ricerca domina con il 91% del mercato. I ricavi 2025 superano $420B con margini operativi del 32%. DeepMind rappresenta il laboratorio AI più avanzato al mondo, con applicazioni che spaziano dalla scoperta di nuovi materiali alla previsione delle strutture proteiche. Il rischio principale è regolatorio (antitrust EU e USA).",
     "sector": "AI Drug Discovery", "region": "Nord America",
     "initial_price": 48.00, "market_cap": 4.8e12,
     "pe_ratio": 30.36, "eps": 1.58, "dividend_yield": 0.0,
     "roi": 0.2720, "roe": 0.3890, "target_price": 62.00,
     "risk_level": 6, "beta": 1.27, "revenue": 4.2e11, "ebitda": 1.6e11,
     "annual_performance": 1.6382},

    # ══════════════════════════════════════════════════════
    # SETTORE 3 — ROBOTICS & AUTOMATION
    # ══════════════════════════════════════════════════════

    {"ticker": "ISRG", "name": "Intuitive Surgical Inc.",
     "description": "Intuitive Surgical è il leader assoluto della chirurgia robotica: il sistema da Vinci ha una base installata di oltre 9.000 sistemi in 70 paesi, con crescita procedure del +20,5% nel 2025 e guidance +13–15% per il 2026. Il modello è razor-and-blade: ogni sistema da Vinci genera ricavi ricorrenti da strumentario (ogni strumento va sostituito dopo 10 usi), manutenzione e formazione. Margini lordi >70%, operating margin >30%. Il moat è quasi inviolabile: i chirurghi si formano su da Vinci per anni, creando switching cost cognitivi enormi. Il sistema da Vinci 5 (2024) integra AI per guidance chirurgica e connettività cloud. Pipeline: sistema Ion per biopsia polmonare, espansione nelle procedure ortopediche. Competizione emergente da Medtronic Hugo e CMR Group, ma ISRG ha 10 anni di vantaggio in dati e reputazione.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 530.00, "market_cap": 1.6e11,
     "pe_ratio": 55.01, "eps": 7.57, "dividend_yield": 0.0,
     "roi": 0.1640, "roe": 0.1720, "target_price": 650.00,
     "risk_level": 5, "beta": 1.51, "revenue": 1.1e10, "ebitda": 3.9e09,
     "annual_performance": -0.1542},

    {"ticker": "ABB", "name": "ABB Ltd",
     "description": "ABB è il leader mondiale nell'automazione industriale e nell'elettrificazione: revenue 2025 di $33,22B (+5,4%), margini operativi in miglioramento. Nel 2025 ABB ha venduto la divisione robotica a SoftBank per $5,38B per concentrarsi su electrification (quadri, trasformatori, convertitori) e process automation (sistemi di controllo per industria chimica, oil&gas, mining). Questa focalizzazione la posiziona direttamente come beneficiaria della Dark Factory Mandate europea e di ogni progetto di automazione industriale su larga scala. È stata designata 'strategic industrial asset' dall'UE nel contesto del Fondo per la Sovranità Tech. Dividendo stabile, bilancio solido, esposizione globale bilanciata tra Europa, USA e Asia. Beta basso per il settore — è la scelta difensiva nell'automazione industriale.",
     "sector": "Robotics & Automation", "region": "Europe",
     "initial_price": 55.00, "market_cap": 1.5e11,
     "pe_ratio": 34.98, "eps": 2.20, "dividend_yield": 1.8,
     "roi": 0.2140, "roe": 0.3360, "target_price": 68.00,
     "risk_level": 4, "beta": 1.02, "revenue": 3.5e10, "ebitda": 7.0e09,
     "annual_performance": 0.8408},

    {"ticker": "TER", "name": "Teradyne Inc.",
     "description": "Teradyne è il proxy quotato diretto per l'evento Soglia Cobot: possiede Universal Robots (cobot, $150M+ revenue) e Mobile Industrial Robots (AMR/MiR, robot mobili autonomi). Il business principale è il test automatico di semiconduttori e dispositivi elettronici — ogni chip prodotto al mondo viene testato su strumenti Teradyne. Nel 2026, il segmento robotics è in forte recupero dopo due anni di contrazione ciclica: nuovi contratti 'plan of record' con grandi operatori logistici globali, e il prezzo dei cobot UR in discesa porta la domanda PMI a livelli record. La doppia esposizione (semiconductor test + robotics) crea una correlazione diretta con i due mega-trend più importanti del gioco. Rischio: ciclicità del mercato semiconductor test, che può comprimere i margini nei down-cycle.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 120.00, "market_cap": 6.0e10,
     "pe_ratio": 70.91, "eps": 3.16, "dividend_yield": 0.6,
     "roi": 0.2930, "roe": 0.2870, "target_price": 155.00,
     "risk_level": 6, "beta": 1.79, "revenue": 3.8e09, "ebitda": 1.2e09,
     "annual_performance": 0.8295},

    {"ticker": "ROK", "name": "Rockwell Automation",
     "description": "Rockwell Automation fornisce il 'sistema nervoso' di ogni impianto manifatturiero automatizzato: PLC (controllori logici programmabili), sistemi SCADA, software MES e piattaforme IIoT per l'industria connessa. Non produce robot, ma fornisce il software e l'infrastruttura di controllo che fa funzionare l'intera fabbrica — inclusi i robot di altri vendor. Beneficia della Dark Factory Mandate senza il rischio hardware di chi produce i robot. Il platform software FactoryTalk è usato da oltre 28.000 impianti globali, creando switching cost elevatissimi. Revenue 2025 $8,57B, in stabilizzazione dopo un 2024 difficile. Margini operativi superiori al 20%. La tesi di investimento è sulla convergenza IT/OT (Information Technology + Operational Technology) come megatrend irreversibile.",
     "sector": "Robotics & Automation", "region": "USA",
     "initial_price": 280.00, "market_cap": 5.1e10,
     "pe_ratio": 51.31, "eps": 10.00, "dividend_yield": 2.5,
     "roi": 0.1650, "roe": 0.2720, "target_price": 345.00,
     "risk_level": 5, "beta": 1.56, "revenue": 8.8e09, "ebitda": 2.0e09,
     "annual_performance": 0.5771},

    # ══════════════════════════════════════════════════════
    # SETTORE 4 — SEMICONDUCTOR & AI INFRA
    # ══════════════════════════════════════════════════════

    {"ticker": "NVDA", "name": "NVIDIA Corp.",
     "description": "NVIDIA è il titolo centrale dell'era AI: revenue FY2026 di $197,3B (di cui 91% data center), net income $72,9B, margini lordi >74%. I chip Blackwell (H200, B100, B200) sono usati da tutti i principali hyperscaler per addestrare e fare inferenza sui modelli AI di frontiera. Il vantaggio competitivo non è solo hardware — è CUDA, la piattaforma software sviluppata per 15 anni che ha creato un ecosistema di milioni di sviluppatori, framework (PyTorch, TensorFlow) e librerie ottimizzate che rendono il cambio di fornitore molto costoso. Beta 2.38 — il titolo più volatile del portafoglio, massima sensibilità a qualsiasi evento che impatti l'AI. Rischi: concentrazione clienti (Microsoft, Google, Amazon, Meta = grande quota revenue), sviluppo chip custom dai clienti, restrizioni export Cina.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 165.00, "market_cap": 4.8e12,
     "pe_ratio": 43.18, "eps": 3.00, "dividend_yield": 0.03,
     "roi": 1.0440, "roe": 1.0150, "target_price": 200.00,
     "risk_level": 7, "beta": 2.24, "revenue": 2.2e11, "ebitda": 1.3e11,
     "annual_performance": 0.8309},

    {"ticker": "INTC", "name": "Intel Corp.",
     "description": "Intel è la storia di un underdog in cerca di riscatto: dopo anni di ritardi tecnologici e perdite di quote di mercato a favore di TSMC e AMD, nel 2026 lancia Loihi 3 — un chip neuromorfico a 4nm con 8 milioni di neuroni e 64 miliardi di sinapsi per chip, capace di elaborare task di inferenza con efficienza energetica 10-1.000x superiore alle GPU tradizionali. Intel è l'unica grande azienda quotata con un roadmap neuromorfico commerciale avanzato. Se questo paradigma decolla, Intel può disruppare NVIDIA. Se non decolla, è un'azienda in perdita ($0,38 EPS negativo nel 2025) con un processo produttivo ancora indietro rispetto a TSMC. Il titolo ha un profilo asimmetrico: limitato downside (già scontato), enorme upside condizionale. Dividendo azzerato nel 2024 per finanziare il turnaround.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 22.00, "market_cap": 5.7e11,
     "pe_ratio": -174.44, "eps": -0.38, "dividend_yield": 0.0,
     "roi": 0.0070, "roe": -0.0290, "target_price": 35.00,
     "risk_level": 7, "beta": 2.19, "revenue": 5.4e10, "ebitda": 1.4e10,
     "annual_performance": 4.0000},

    {"ticker": "AVGO", "name": "Broadcom Inc.",
     "description": "Broadcom è l'alternativa strutturale a NVIDIA per chi vuole esposizione all'AI infra senza il rischio GPU-singolo: detiene il 90% del mercato degli ASIC custom (chip AI progettati ad hoc per il cliente specifico). Co-sviluppa il TPU di Google, il chip custom di Meta e chip per Apple. Backlog AI chips da $73 miliardi per i prossimi 18 mesi. Free cash flow $26,9B — uno dei FCF più alti nel settore tech. Revenue 2025 $64B (+24%), con guidance di crescita sostenuta. L'acquisizione di VMware (2023, $69B) ha trasformato Broadcom anche in un leader dell'infrastruttura cloud enterprise. La differenza con NVIDIA: mentre NVIDIA vende GPU standard a molti clienti, Broadcom lavora su chip dedicati — meno volatilità, margini più stabili, legami più profondi con i clienti.",
     "sector": "Semiconductor & AI Infra", "region": "USA",
     "initial_price": 200.00, "market_cap": 2.0e12,
     "pe_ratio": 80.58, "eps": 5.00, "dividend_yield": 1.8,
     "roi": 0.1670, "roe": 0.3340, "target_price": 240.00,
     "risk_level": 6, "beta": 1.44, "revenue": 6.8e10, "ebitda": 3.7e10,
     "annual_performance": 1.1464},

    {"ticker": "ASML", "name": "ASML Holding NV",
     "description": "ASML è il monopolio assoluto nella litografia EUV: il 94% del market share globale, senza le sue macchine nessun chip avanzato sotto i 3nm può essere prodotto al mondo. Revenue 2025 €32,7B (+15,6%), guidance 2026 €34–39B. Ogni macchina EUV High-NA costa oltre €350 milioni e richiede 3 anni di lead time. I clienti principali — TSMC, Samsung, Intel — dipendono da ASML per mantenere la roadmap tecnologica. È stata citata esplicitamente nel corso STF come eccezione al gap tecnologico europeo (la sola azienda EU in posizione di monopolio tecnologico globale). Le restrizioni all'export verso la Cina (imposte dal governo olandese sotto pressione USA) hanno tolto il 15% del mercato potenziale ma non hanno impattato significativamente la crescita, dato che la domanda da TSMC e Samsung copre abbondantemente la capacità produttiva.",
     "sector": "Semiconductor & AI Infra", "region": "Europe",
     "initial_price": 800.00, "market_cap": 5.5e11,
     "pe_ratio": 57.25, "eps": 17.78, "dividend_yield": 0.6,
     "roi": 0.4540, "roe": 0.5220, "target_price": 980.00,
     "risk_level": 6, "beta": 1.37, "revenue": 3.4e10, "ebitda": 1.3e10,
     "annual_performance": 0.6150},

    # ══════════════════════════════════════════════════════
    # SETTORE 5 — NUCLEAR & CLEAN ENERGY
    # ══════════════════════════════════════════════════════

    {"ticker": "CEG", "name": "Constellation Energy Corp.",
     "description": "Constellation Energy è il più grande produttore di energia nucleare degli USA con 31.676 MW di capacità installata — circa il 10% dell'intera generazione elettrica americana. Nel 2026 ha firmato Power Purchase Agreement (PPA) con Microsoft, Google e altri hyperscaler AI per fornire energia nucleare a basse emissioni direttamente ai loro data center. Questi contratti pluriennali a prezzo fisso garantiscono visibilità dei ricavi senza precedenti nel settore utility. Con la crisi del Muro dell'Energia (data center che consumano il 19% dell'elettricità globale), Constellation è diventata un asset strategico per l'economia dell'AI: l'unica fonte in grado di fornire potenza H24 stabile e scalabile in grado di alimentare un data center di grandi dimensioni. Revenue 2025 $25,53B (+8,3%), EBITDA in crescita.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 300.00, "market_cap": 1.2e11,
     "pe_ratio": 32.55, "eps": 8.57, "dividend_yield": 1.0,
     "roi": 0.1480, "roe": 0.1640, "target_price": 390.00,
     "risk_level": 5, "beta": 1.15, "revenue": 2.6e10, "ebitda": 5.6e09,
     "annual_performance": 1.0512},

    {"ticker": "VST", "name": "Vistra Corp.",
     "description": "Vistra è il player energetico più diversificato del portafoglio: 44.000 MW di capacità installata con mix nucleare + gas + solare + battery storage. Nel 2026 ha firmato un PPA da 1.200 MW con un grande operatore di data center AI per 20 anni. EBITDA 2026 guidance $6,8–7,6B. La diversificazione del portfolio energetico è il differenziale rispetto a Constellation: mentre CEG è 100% nucleare, Vistra può ottimizzare il dispatch tra nucleare, gas e rinnovabili in base al prezzo di mercato dell'elettricità, catturando spread di arbitraggio. Il business di stoccaggio in batterie (370 MW operativi nel 2026) le dà anche flessibilità per servire la rete in momenti di picco. Rischio principale: maggiore esposizione ai prezzi spot dell'elettricità rispetto a CEG.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 155.00, "market_cap": 5.4e10,
     "pe_ratio": 70.76, "eps": 5.17, "dividend_yield": 0.8,
     "roi": 0.0460, "roe": 0.1770, "target_price": 200.00,
     "risk_level": 6, "beta": 1.45, "revenue": 1.8e10, "ebitda": 5.2e09,
     "annual_performance": 0.1092},

    {"ticker": "OKLO", "name": "Oklo Inc.",
     "description": "Oklo è il titolo più speculativo del portafoglio: sviluppa micro-reattori nucleari di quarta generazione (Aurora Powerhouse, 15-50 MW) per alimentare data center, basi militari e siti industriali remoti. Revenue: praticamente zero (meno di $1M), primo reattore in costruzione in Idaho previsto per il 2027. Market cap $9,9B — interamente basato su aspettative future. I fondatori vengono da OpenAI (il CEO Sam Altman è stato co-fondatore e investitore). I potenziali clienti includono Microsoft, Google e il Dipartimento della Difesa USA. La proposta di valore è unica: energia nucleare in moduli da 50 MW installabili in 18 mesi, contro 10-15 anni di un reattore tradizionale. Se la tecnologia SMR decolla nei prossimi anni, OKLO è l'upside più estremo del settore. Se slittano i permessi o emergono problemi tecnici, il cash si esaurisce.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 55.00, "market_cap": 1.2e10,
     "pe_ratio": -89.15, "eps": -0.30, "dividend_yield": 0.0,
     "roi": -0.1160, "roe": -0.1220, "target_price": 85.00,
     "risk_level": 10, "beta": 1.18, "revenue": 0.0, "ebitda": -1.4e08,
     "annual_performance": 6.7077},

    {"ticker": "CCJ", "name": "Cameco Corp.",
     "description": "Cameco è il secondo produttore mondiale di uranio con il 15% della produzione globale, operazioni primarie in Canada (Cigar Lake, McArthur River) e Kazakhstan. È la commodity play diretta sull'espansione nucleare: ogni scenario di crescita del nucleare — SMR, nuovi reattori convenzionali, riattivazione di impianti esistenti, data center AI — si traduce in domanda di uranio. Uranium spot price aprile 2026: $84,25/lb, con previsioni Citi di $100–125/lb entro 2027 sulla scia della politica energetica post-Muro dell'Energia. A differenza di OKLO (speculative pre-revenue) e CEG/VST (utility operative), Cameco è il pick-and-shovel play: non dipende dal successo di un singolo progetto, ma dal trend strutturale di lungo termine verso l'energia nucleare come componente essenziale del mix energetico per AI e decarbonizzazione.",
     "sector": "Nuclear & Clean Energy", "region": "USA",
     "initial_price": 50.00, "market_cap": 5.4e10,
     "pe_ratio": 108.23, "eps": 1.25, "dividend_yield": 0.3,
     "roi": 0.1140, "roe": 0.0960, "target_price": 65.00,
     "risk_level": 7, "beta": 1.03, "revenue": 3.5e09, "ebitda": 8.9e08,
     "annual_performance": 0.7839},

    # ══════════════════════════════════════════════════════
    # SETTORE 6 — HEALTHCARE SYSTEMS
    # ══════════════════════════════════════════════════════

    {"ticker": "UNH", "name": "UnitedHealth Group Inc.",
     "description": "UnitedHealth è il più grande assicuratore sanitario USA con $447,56B di revenue TTM — la quinta azienda per ricavi al mondo. Ma il 2025 è stato devastante: perdita operativa di $278M (vs +$7,8B nel 2024) per la combinazione di tagli ai rimborsi Medicare Advantage, inflazione dei costi medici e l'impatto della violazione informatica di Change Healthcare. Il titolo ha perso il 35% da gennaio 2025. UNH è il caso di studio perfetto del paradosso difensivo: un'azienda enorme non è necessariamente sicura — i rischi regolatori e i cicli di rimborso Medicare possono distruggere i margini nonostante la scala. Per il 2026, il mercato sta prezzando una normalizzazione dei costi medici e un recupero del loss operativo. Il dividendo rimane stabile. Beta 0.38 — nonostante la crisi, il titolo si muove poco rispetto al mercato.",
     "sector": "Healthcare Systems", "region": "USA",
     "initial_price": 280.00, "market_cap": 3.3e11,
     "pe_ratio": 27.92, "eps": 10.03, "dividend_yield": 1.7,
     "roi": 0.0690, "roe": 0.1220, "target_price": 360.00,
     "risk_level": 6, "beta": 0.65, "revenue": 4.5e11, "ebitda": 2.1e10,
     "annual_performance": -0.1139},

    {"ticker": "LLY", "name": "Eli Lilly and Co.",
     "description": "Eli Lilly è l'azienda farmaceutica in più rapida crescita al mondo nel 2025-2026: revenue +45% a $65,2B, trainati dai farmaci GLP-1 per obesità e diabete — Mounjaro ($23B) e Zepbound ($13,5B) che insieme dominano il 60% del mercato weight-loss globale. La guidance 2026 è $80–83B. Ha firmato un deal da $2,75B con Insilico Medicine per 28 farmaci AI-generati e ha un co-laboratorio con NVIDIA per accelerare il drug discovery. Lilly è il caso paradigmatico di una Big Pharma che ha abbracciato l'AI per mantenere la leadership: ha costruito impianti produttivi in USA, Europa e Asia per scalare la produzione di semaglutide e tirzepatide, con capex miliardari annui. Rischio principale: scadenza dei brevetti GLP-1 e competizione da Novo Nordisk (Ozempic/Wegovy). Beta bassissimo nonostante la crescita esplosiva.",
     "sector": "Healthcare Systems", "region": "USA",
     "initial_price": 850.00, "market_cap": 8.8e11,
     "pe_ratio": 34.63, "eps": 15.45, "dividend_yield": 0.6,
     "roi": 0.2500, "roe": 1.0750, "target_price": 1100.00,
     "risk_level": 6, "beta": 0.48, "revenue": 7.2e10, "ebitda": 3.6e10,
     "annual_performance": 0.2828},

    {"ticker": "AZN", "name": "AstraZeneca PLC",
     "description": "AstraZeneca è la Big Pharma con il target più ambizioso del settore: $80B di revenue entro il 2030 (vs $55B attuali), guidata da un portfolio oncologico di 28 prodotti in commercio e una pipeline con 180 molecole in sviluppo. Crescita EPS +45,3% nel 2025, revenue +20% a £42,48B. L'oncologia AI-driven è il driver principale: partnership con Isomorphic Labs, Recursion e altri per integrare il drug discovery computazionale nella pipeline. Presenza in 130+ paesi e 28 impianti produttivi globali la rendono resiliente alle interruzioni di supply chain. AZN è la rappresentazione di cosa succede quando una Big Pharma europea abbraccia l'AI sistematicamente — non come sperimentazione, ma come motore dell'intera pipeline. Defensive nella struttura (beta 0.23) ma con uno dei migliori profili di crescita nel settore pharma tradizionale.",
     "sector": "Healthcare Systems", "region": "Europe",
     "initial_price": 73.00, "market_cap": 2.9e11,
     "pe_ratio": 27.43, "eps": 2.92, "dividend_yield": 2.5,
     "roi": 0.1640, "roe": 0.2350, "target_price": 92.00,
     "risk_level": 5, "beta": 0.22, "revenue": 6.0e10, "ebitda": 2.0e10,
     "annual_performance": 0.2658},

    {"ticker": "MDT", "name": "Medtronic PLC",
     "description": "Medtronic è il proxy per la convergenza tra healthcare tradizionale e robotica: il suo sistema Hugo di chirurgia robotica è in attesa di FDA clearance per urologia (prevista 2026) e ha già approvazione CE. Revenue 2025 $35,5B (+6,9%), con 4 aree di crescita identificate a $1B+ ciascuna: neuroscienze (stimolazione cerebrale), cardiovascolare (TAVR), diabetes (closed-loop insulin delivery) e chirurgia robotica. Il vantaggio competitivo è la relazione con 100.000+ cardiologi, neurologi e chirurghi nel mondo che usano strumenti Medtronic quotidianamente — switching cost enormi basati sulla familiarità clinica. Il beta più basso del settore Robotics (0.55): è il modo difensivo di investire nella chirurgia robotica. Competizione crescente da ISRG (da Vinci dominante) e startup emergenti.",
     "sector": "Healthcare Systems", "region": "Europe",
     "initial_price": 82.00, "market_cap": 1.0e11,
     "pe_ratio": 24.52, "eps": 4.10, "dividend_yield": 3.5,
     "roi": 0.0960, "roe": 0.0940, "target_price": 102.00,
     "risk_level": 4, "beta": 0.63, "revenue": 3.5e10, "ebitda": 9.4e09,
     "annual_performance": 0.1254},

    # ══════════════════════════════════════════════════════
    # SETTORE 7 — LOGISTICS & SUPPLY CHAIN
    # ══════════════════════════════════════════════════════

    {"ticker": "UPS", "name": "United Parcel Service Inc.",
     "description": "UPS gestisce il 20–23% del volume parcel USA con 500.000+ dipendenti e una rete di 100.000+ veicoli di consegna. Il titolo rappresenta la logistica difensiva: stabile, generatrice di cash, con un dividendo tra i più alti del settore. Ma il 2025 è stato difficile: calo dei volumi post-COVID, rinnovo contrattuale Teamsters con aumenti salariali pesanti, e perdita di contratti Amazon (che sta verticalizzando la logistica con la propria rete da 6 miliardi di pacchi annui). Investimenti in automazione accelerati ma ancora insufficienti per recuperare il gap competitivo. UPS è il titolo più difensivo della categoria Logistics, ma ha il maggiore rischio di disruption strutturale da parte dei tech player. Dividendo yield >5% — uno dei più alti nel portafoglio.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 100.00, "market_cap": 8.5e10,
     "pe_ratio": 21.85, "eps": 6.67, "dividend_yield": 5.2,
     "roi": 0.1640, "roe": 0.3340, "target_price": 120.00,
     "risk_level": 4, "beta": 1.05, "revenue": 8.8e10, "ebitda": 1.2e10,
     "annual_performance": 0.1463},

    {"ticker": "FDX", "name": "FedEx Corp.",
     "description": "FedEx ha superato UPS in capitalizzazione di mercato per la prima volta a marzo 2026, dopo anni di ristrutturazione. Il piano Network 2.0 è la scommessa operativa: consolidare Express e Ground in rete unica, chiudere 475+ hub obsoleti, ridurre i costi di pickup del 10%. Partnership con il Dipartimento dell'Energia USA per furgoni a idrogeno in California. Revenue ~$88B, margini in miglioramento strutturale. FedEx è il 'turnaround play' della logistica: chi crede nella ristrutturazione ha un upside significativo; chi non ci crede vede solo costi di taglio e ricavi stabili. La differenza con UPS: FedEx ha meno esposizione ai sindacati e più flessibilità operativa nel breve termine. Dividend yield modesto ma stabile.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 320.00, "market_cap": 8.5e10,
     "pe_ratio": 20.02, "eps": 17.78, "dividend_yield": 2.5,
     "roi": 0.1600, "roe": 0.1590, "target_price": 390.00,
     "risk_level": 5, "beta": 1.30, "revenue": 9.2e10, "ebitda": 1.2e10,
     "annual_performance": 0.7555},

    {"ticker": "AMZN", "name": "Amazon.com Inc.",
     "description": "Amazon è la logistica più grande al mondo mascherata da tech company: 6,1 miliardi di pacchi consegnati nel 2024, superando USPS come primo carrier USA. 750.000+ robot Kiva nei warehouse. Revenue stimata FY2025 $638B. Ma il driver principale del valore è AWS — cloud computing, 31% di market share globale, >60% dell'operating income totale. Nel contesto del gioco, Amazon è inserita nella Logistics per la sua posizione dominante nella supply chain fisica (robot, hub, consegne), ma è anche un proxy diretto per l'AI infra (AWS) e il commercio globale. Ogni evento di Soglia Cobot, Dark Factory o disruption logistica la colpisce direttamente nei suoi 1.000+ warehouse. Ogni evento che accelera l'AI infra la beneficia via AWS. Il titolo con il maggior numero di correlazioni nel portafoglio.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 215.00, "market_cap": 2.9e12,
     "pe_ratio": 32.41, "eps": 6.72, "dividend_yield": 0.0,
     "roi": 0.1310, "roe": 0.2430, "target_price": 255.00,
     "risk_level": 7, "beta": 1.47, "revenue": 7.4e11, "ebitda": 1.6e11,
     "annual_performance": 0.4370},

    {"ticker": "XPO", "name": "XPO Inc.",
     "description": "XPO è lo specialista LTL (less-than-truckload) con forte componente AI nell'ottimizzazione dei percorsi e nel pricing dinamico. Revenue TTM $8,15B, più esposta ai cicli industriali rispetto a UPS/FDX ma con maggiore leva operativa — quando i volumi crescono, i margini crescono più velocemente. XPO beneficia direttamente dal reshoring manifatturiero e dalla Dark Factory Mandate: le fabbriche che si automatizzano in Europa e USA hanno bisogno di movimentare componenti e prodotti finiti via LTL. La componente AI nel pricing le dà un vantaggio competitivo sulla marginalità rispetto ai player tradizionali. È il titolo più ciclico e più speculativo del settore logistica: massima leva operativa, quindi massimo upside nei cicli positivi e massimo rischio nei downturn.",
     "sector": "Logistics & Supply Chain", "region": "USA",
     "initial_price": 135.00, "market_cap": 2.5e10,
     "pe_ratio": 70.88, "eps": 3.86, "dividend_yield": 0.0,
     "roi": 0.2140, "roe": 0.1990, "target_price": 170.00,
     "risk_level": 7, "beta": 1.67, "revenue": 8.3e09, "ebitda": 1.3e09,
     "annual_performance": 0.8897},

    # ══════════════════════════════════════════════════════
    # SETTORE 8 — FOOD & AGRITECH
    # ══════════════════════════════════════════════════════

    {"ticker": "DE", "name": "John Deere & Co.",
     "description": "John Deere è il leader mondiale nelle macchine agricole autonome e nel precision farming: ogni trattore di nuova generazione ha GPS centimetrico, sensori multispettrali, computer vision e può operare in modalità completamente autonoma. Revenue 2025 $45,7B (-11,7%) per il ciclo basso del settore agricolo, ma Q1 2026 +13% YoY segnala il recupero. Il sistema operativo JDLink connette 500.000+ macchine in campo in tempo reale, generando dati agronomici che Deere monetizza con servizi software a valore aggiunto. È il beneficiario diretto dell'evento ZeroFarm: se le vertical farm si espandono, servono robot di raccolta e sistemi di automazione — Deere è il brand con la tecnologia e il canale per fornirli. Anche beneficia dal Paradosso Risolto: robot che operano in campo aperto erano impossibili senza navigazione in ambienti non strutturati.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 430.00, "market_cap": 1.6e11,
     "pe_ratio": 14.58, "eps": 19.55, "dividend_yield": 2.5,
     "roi": 0.1930, "roe": 0.1960, "target_price": 530.00,
     "risk_level": 5, "beta": 0.97, "revenue": 4.7e10, "ebitda": 8.6e09,
     "annual_performance": 0.1845},

    {"ticker": "CTVA", "name": "Corteva Inc.",
     "description": "Corteva — spin-off di DowDuPont — è il provider dell'OS dell'agricoltura moderna: sementi geneticamente ottimizzate (Pioneer) + protezione colture (Mycogen, Brevant) + software di precision agriculture (Granular). Revenue 2025 $17,4B (+2,9%), consensus 2026 +4,4% vendite e +7,2% EPS. È l'azienda che vende l'infrastruttura digitale delle decisioni agronomiche: quale seme piantare, quando irrigare, quando e quanto trattare, ottimizzato per massimizzare la resa per ettaro. Beneficia sia dall'automazione agricola (i robot agricoli usano i dati di Corteva per prendere decisioni) sia dalla pressione climatica sui raccolti (le sue sementi resistenti alla siccità diventano più preziose). Rischio principale: brevetti sulle sementi OGM sotto scrutinio regolatorio in Europa.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 65.00, "market_cap": 5.6e10,
     "pe_ratio": 45.16, "eps": 2.95, "dividend_yield": 1.0,
     "roi": 0.0390, "roe": 0.0510, "target_price": 80.00,
     "risk_level": 5, "beta": 0.59, "revenue": 1.8e10, "ebitda": 4.1e09,
     "annual_performance": 0.2909},

    {"ticker": "AGCO", "name": "AGCO Corp.",
     "description": "AGCO produce macchine agricole premium per l'automazione: Fendt (brand premium europeo con i trattori autonomi più avanzati d'Europa), Massey Ferguson e Challenger. Revenue 2025 $10,1B (-13,5%) per il ciclo basso del settore, con guidance 2026 $10,4–10,7B. Fendt è considerato il Ferrari dei trattori agricoli: completamente autonomo, integrato con sistemi di navigazione da satellite, telecamere 360° e AI per il riconoscimento delle colture. In Europa, Fendt ha il 25%+ di market share nel segmento premium, con margini più alti del segmento budget. AGCO è più piccola e più volatile di Deere — più esposta al ciclo agricolo europeo — ma con maggiore upside se l'automazione agricola accelera in Europa (dove si concentra il business Fendt).",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 100.00, "market_cap": 8.3e09,
     "pe_ratio": 12.16, "eps": 8.33, "dividend_yield": 1.5,
     "roi": 0.1700, "roe": 0.1750, "target_price": 130.00,
     "risk_level": 6, "beta": 1.12, "revenue": 1.0e10, "ebitda": 1.0e09,
     "annual_performance": 0.4981},

    {"ticker": "ADM", "name": "Archer Daniels Midland Co.",
     "description": "ADM è il più grande trader e processore di commodity agricole al mondo: soia, mais, frumento, semi oleosi — il 60%+ del commercio globale passa attraverso la sua rete di elevatori, terminal portuali e impianti di trasformazione. Revenue ~$80B ma margini bassissimi (trading commodity). Il 2024 è stato devastante: scandalo contabile che ha portato il CFO alle dimissioni, indagine SEC, market cap dimezzato. Nel 2026 è in fase di recupero della fiducia degli investitori, con nuovo management e audit interno completato. La tesi di investimento è contrarian: se ZeroFarm si afferma e la produzione alimentare aumenta (più volume da processare), ADM beneficia indipendentemente dalla fonte. Ma se le filiere si accorciano (vertical farm urbane → distribuzione locale), perde volumi sui contratti di lunga distanza.",
     "sector": "Food & AgriTech", "region": "USA",
     "initial_price": 60.00, "market_cap": 3.8e10,
     "pe_ratio": 34.81, "eps": 5.00, "dividend_yield": 3.0,
     "roi": 0.0400, "roe": 0.0480, "target_price": 80.00,
     "risk_level": 5, "beta": 0.58, "revenue": 8.1e10, "ebitda": 2.5e09,
     "annual_performance": 0.6870},

]

# ─── TEST PLAYERS ─────────────────────────────────────────────

TEST_PLAYERS = [
    {"name": "Team Alpha", "initial_cash": 10000000.0},
    {"name": "Team Beta", "initial_cash": 10000000.0},
    {"name": "Team Gamma", "initial_cash": 10000000.0},
    {"name": "Team Delta", "initial_cash": 10000000.0},
    {"name": "Team Epsilon", "initial_cash": 10000000.0},
]


def seed_database():
    """Popola il database con i dati iniziali."""
    init_db()
    conn = get_db()

    try:
        # Verifica se il DB e' gia' popolato
        existing = conn.execute("SELECT COUNT(*) FROM securities").fetchone()[0]
        if existing > 0:
            print("Database gia' popolato. Usa --force per sovrascrivere.")
            if "--force" not in sys.argv:
                return
            # Reset: DROP e ricrea tutte le tabelle per supportare nuove colonne
            tables = [
                "baseline_drift_history", "security_internal_variables",
                "pending_impacts", "used_game_events",
                "event_impacts", "events", "event_templates",
                "trades", "portfolio_history",
                "securities_price_history", "portfolios", "players",
                "securities", "game_state", "game_flags"
            ]
            for table in tables:
                conn.execute(f"DROP TABLE IF EXISTS {table}")
            conn.commit()
            conn.close()
            # Ricrea lo schema
            init_db()
            conn = get_db()
            print("Database resettato e schema ricreato.")

        # Inserisci securities con metriche fondamentali e valori iniziali per reset
        for s in SECURITIES:
            p = s["initial_price"]
            mc = s.get("market_cap", 0)
            pe = s.get("pe_ratio", 0)
            eps_v = s.get("eps", 0)
            roi_v = s.get("roi", 0)
            roe_v = s.get("roe", 0)
            tp = s.get("target_price", 0)
            rev = s.get("revenue", 0)
            ebitda_v = s.get("ebitda", 0)
            conn.execute(
                """INSERT INTO securities (ticker, name, description, sector, region,
                   initial_price, current_price, market_cap, pe_ratio, eps,
                   dividend_yield, roi, roe, target_price, risk_level,
                   open_price, close_price, bid, ask, beta,
                   revenue, ebitda, annual_performance,
                   initial_market_cap, initial_revenue, initial_ebitda,
                   initial_eps, initial_pe_ratio, initial_roi, initial_roe, initial_target_price)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                           ?, ?, ?, ?, ?, ?, ?, ?)""",
                (s["ticker"], s["name"], s["description"], s["sector"], s["region"],
                 p, p, mc, pe, eps_v,
                 s.get("dividend_yield", 0), roi_v, roe_v, tp, s.get("risk_level", 5),
                 round(p * 0.995, 2), p, round(p - 0.05, 2), round(p + 0.05, 2),
                 s.get("beta", 1.0), rev, ebitda_v, s.get("annual_performance", 0),
                 mc, rev, ebitda_v, eps_v, pe, roi_v, roe_v, tp)
            )
        print(f"Inseriti {len(SECURITIES)} titoli.")

        # Inizializza variabili interne per ogni titolo (12 variabili a 50.0)
        all_securities = conn.execute("SELECT id FROM securities ORDER BY id").fetchall()
        for sec_row in all_securities:
            repo.init_internal_variables(conn, sec_row[0], INTERNAL_VARIABLES)
        print(f"Inizializzate {len(INTERNAL_VARIABLES)} variabili interne per {len(all_securities)} titoli.")

        # Inserisci test players
        for p in TEST_PLAYERS:
            conn.execute(
                "INSERT INTO players (name, initial_cash, current_cash) VALUES (?, ?, ?)",
                (p["name"], p["initial_cash"], p["initial_cash"])
            )
        print(f"Inseriti {len(TEST_PLAYERS)} giocatori di test.")

        # Inserisci storico prezzi pre-game (cicli -5 → -1)
        seed_price_history(conn)

        conn.commit()
        print("\nSeed completato con successo!")

    except Exception as e:
        conn.rollback()
        print(f"Errore durante il seed: {e}")
        raise
    finally:
        conn.close()


# ─── STORICO PRE-GAME (5 trimestri precedenti) ────────────────────────────────
# Mapping: array[0..4] → cicli -5..-1 (oldest → newest)
# array[0] = Q1 2025 (Mar 2025)   →  ciclo -5
# array[1] = Q2 2025 (Jun 2025)   →  ciclo -4
# array[2] = Q3 2025 (Sep 2025)   →  ciclo -3
# array[3] = Q4 2025 (Dec 2025)   →  ciclo -2
# array[4] = Q1 2026 (Mar 2026)   →  ciclo -1
# Ciclo 0 = current_price, salvato da start_game().
# Fonte: azioni_storico_5_trimestri.xlsx (Digrin monthly real price, ultimo mese del trimestre).
# Integrazioni Yahoo Finance (14 mag 2026):
#   - ABB: 5 trimestri da ADR OTC USA "ABBNY" (USD) dopo delisting NYSE.
#   - SDGR: Q4 2025 (17.88) e Q1 2026 (11.36).
#   - AGCO: Q1 2026 (115.87).

HISTORICAL_PRICES = {
    # ticker:  [Q1 2025, Q2 2025, Q3 2025, Q4 2025, Q1 2026]
    "ABB":     [   52.14,    59.67,    71.95,    73.97,    80.48],
    "ADM":     [   48.01,    52.78,    59.74,    57.49,    72.69],
    "AGCO":    [   92.57,   103.16,   107.07,   104.32,   115.87],
    "AMZN":    [  190.26,   219.39,   219.57,   230.82,   208.27],
    "ASML":    [  662.63,   801.39,   968.09,  1069.86,  1320.83],
    "AVGO":    [  167.43,   275.65,   329.91,   346.10,   309.51],
    "AZN":     [   73.50,    69.88,    76.72,    91.93,   197.22],
    "BNTX":    [   91.06,   106.47,    98.62,    95.20,    88.88],
    "CCJ":     [   41.16,    74.23,    83.86,    91.49,   108.61],
    "CEG":     [  201.63,   322.76,   329.07,   353.27,   279.25],
    "CRSP":    [   34.03,    48.64,    64.81,    52.44,    47.57],
    "CTVA":    [   62.93,    74.53,    67.63,    67.03,    83.71],
    "DE":      [  469.35,   508.49,   457.26,   465.57,   563.30],
    "FDX":     [  243.78,   227.31,   235.81,   288.86,   356.18],
    "GOOGL":   [  154.64,   176.23,   243.10,   313.00,   287.56],
    "ILMN":    [   79.34,    95.41,    94.97,   131.16,   123.26],
    "INTC":    [   22.71,    22.40,    33.55,    36.90,    44.13],
    "ISRG":    [  495.27,   543.41,   447.23,   566.36,   460.99],
    "LLY":     [  825.91,   779.53,   763.00,  1074.68,   919.77],
    "MDT":     [   89.86,    87.17,    95.24,    96.06,    86.65],
    "MRNA":    [   28.35,    27.59,    25.83,    29.49,    50.80],
    "NVDA":    [  108.38,   157.99,   186.58,   186.50,   174.40],
    "OKLO":    [   21.63,    55.99,   111.63,    71.76,    49.59],
    "ROK":     [  258.38,   332.17,   349.53,   389.07,   358.88],
    "RXRX":    [    5.29,     5.06,     4.88,     4.09,     3.07],
    "SDGR":    [   19.74,    20.12,    20.06,    17.88,    11.36],
    "TER":     [   82.60,    89.92,   137.64,   193.56,   296.46],
    "UNH":     [  523.75,   311.97,   345.30,   330.11,   270.59],
    "UPS":     [  109.99,   100.94,    83.53,    99.19,    98.38],
    "VRTX":    [  484.82,   445.20,   391.64,   453.36,   446.54],
    "VST":     [  117.44,   193.81,   195.92,   161.33,   150.33],
    "XPO":     [  107.58,   126.29,   129.27,   135.91,   194.55],
}


def seed_price_history(conn):
    """
    Inserisce 5 cicli di storico pre-game (cicli -5 → -1).
    Il ciclo 0 viene salvato automaticamente da start_game() con i prezzi correnti.
    Solo per uso grafico: nessun impatto su eventi o drift.
    """
    # Mappa ticker → security_id
    rows = conn.execute("SELECT id, ticker FROM securities").fetchall()
    ticker_to_id = {ticker: sid for sid, ticker in rows}

    inserted = 0
    skipped = 0
    for ticker, prices in HISTORICAL_PRICES.items():
        sid = ticker_to_id.get(ticker)
        if sid is None:
            print(f"  [WARN] ticker '{ticker}' non trovato nel DB, skip")
            skipped += 1
            continue
        # cycle_offset: -5, -4, -3, -2, -1  →  price[0..4]
        for i, price in enumerate(prices):
            cycle = -5 + i  # -5, -4, -3, -2, -1
            conn.execute(
                "INSERT INTO securities_price_history (security_id, cycle_number, price) VALUES (?, ?, ?)",
                (sid, cycle, round(price, 2))
            )
        inserted += 1

    print(f"Storico pre-game inserito: {inserted} titoli x 5 cicli ({skipped} skipped).")


if __name__ == "__main__":
    seed_database()
