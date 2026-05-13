# Investment Portfolio Simulator

Simulatore di portafogli di investimento a turni, pensato per workshop didattici.
I giocatori gestiscono portafogli di titoli fittizi attraverso cicli temporali (trimestri),
reagendo a eventi di mercato generati dal sistema.

## Architettura

```
Frontend (React + TypeScript + TailwindCSS)
├── Player Interface    (porta 3001) - Gestione portafoglio individuale
├── Master Interface    (porta 3002) - Controllo del gioco
└── TV Dashboard        (porta 3003) - News e classifica pubblica

Backend (Python + FastAPI)
└── API REST            (porta 8000) - Game engine + SQLite
```

## Requisiti

- Python 3.9+
- Node.js 20+
- npm 10+

## Setup e Avvio

### 1. Backend

```bash
# Dalla root del progetto
cd backend
pip install -r requirements.txt

# Inizializza il database con dati di test
cd ..
python -m database.seed

# Avvia il server backend
uvicorn backend.main:app --reload --port 8000
```

Il backend sara' disponibile su http://localhost:8000
Documentazione API interattiva: http://localhost:8000/docs

### 2. Frontend

Ogni frontend va avviato separatamente in un terminale dedicato:

```bash
# Player Interface (porta 3001)
cd frontend/player-interface
npm install
npm run dev

# Master Interface (porta 3002)
cd frontend/master-interface
npm install
npm run dev

# TV Dashboard (porta 3003)
cd frontend/tv-dashboard
npm install
npm run dev
```

### 3. Reset Database

Per resettare e ripopolare il database:

```bash
python -m database.seed --force
```

## Come Giocare

1. **Avvia il backend** e almeno il **Master Interface** e il **Player Interface**
2. Dal **Master Interface**:
   - Crea i giocatori/team (o usa quelli di test gia' presenti)
   - Clicca **"Start Game"** impostando il numero di cicli (es. 4)
   - Clicca **"Next Cycle"** per generare gli eventi del primo turno
3. Dal **Player Interface**:
   - Seleziona il tuo team dal menu
   - Leggi le notizie del ciclo
   - Compra e vendi titoli durante la fase decisionale
4. Dal **Master Interface**:
   - Clicca **"Close Phase"** per chiudere la fase decisionale
   - Clicca **"Next Cycle"** per avanzare al turno successivo
5. Ripeti fino al completamento dei cicli. Vince il team con la performance piu' alta.

## Struttura del Progetto

```
/backend
  /persistence      # Database, connessione SQLite, repository CRUD
  /game             # Logica stato partita, cicli, leaderboard
  /portfolio        # Gestione portafogli e ordini
  /event_mgmt       # CRUD template eventi, generazione eventi
  /impact           # Calcolo e applicazione impatti sui prezzi
  /llm_client       # Client LLM (mock in v1)
  /api              # Endpoint REST (FastAPI)
  main.py           # Entry point FastAPI
  requirements.txt

/frontend
  /player-interface # SPA React - vista giocatore
  /master-interface # SPA React - vista master
  /tv-dashboard     # SPA React - dashboard pubblica

/database
  seed.py           # Script di inizializzazione dati
  game.db           # Database SQLite (generato)

spec.md             # Specifiche tecniche dettagliate
README.md
```

## API Endpoints

### Game / Dashboard
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/game/state` | Stato partita |
| GET | `/api/stocks` | Lista titoli |
| GET | `/api/stocks/{id}/history` | Storico prezzi |
| GET | `/api/events/current` | Eventi ciclo corrente |
| GET | `/api/events` | Tutti gli eventi |
| GET | `/api/leaderboard` | Classifica |

### Player
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/player/{id}` | Portafoglio giocatore |
| GET | `/api/player/{id}/trades` | Storico operazioni |
| POST | `/api/player/{id}/trade` | Esegui ordine |

### Master
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/master/game/start` | Avvia partita |
| POST | `/api/master/next_cycle` | Avanza ciclo |
| POST | `/api/master/close_phase` | Chiudi fase |
| POST | `/api/master/players` | Crea giocatore |
| GET | `/api/master/players` | Lista giocatori |
| PATCH | `/api/master/players/{id}` | Modifica giocatore |

### Admin Eventi
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/admin/event-templates` | Lista template |
| POST | `/api/admin/event-templates` | Crea template |
| PUT | `/api/admin/event-templates/{id}` | Modifica template |
| DELETE | `/api/admin/event-templates/{id}` | Disattiva template |

## Configurazione LLM

In v1, il modulo LLM e' un mock che genera eventi casuali ma coerenti.
Per integrare un LLM reale in futuro, sostituire il modulo `backend/llm_client/mock_llm.py`
con un'implementazione che chiami OpenAI, Anthropic o altro provider.

## Sviluppi Futuri (non in v1)

- Integrazione LLM reale (OpenAI/Anthropic)
- Import/export dati da Excel/CSV
- Autenticazione JWT
- Indicatori tecnici avanzati (RSI, Bollinger, candlestick)
- Modello DCF e analisi Fama-French
- WebSocket per aggiornamenti real-time
