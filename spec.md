# Investment Portfolio Simulator - Specifiche Tecniche

## 1. Panoramica del Sistema

Il sistema e' un simulatore di portafogli di investimento a turni, pensato per workshop didattici.
I giocatori (o team) gestiscono portafogli di titoli fittizi attraverso cicli temporali (trimestri).
A ogni ciclo, il sistema genera eventi di mercato tramite un modulo LLM (inizialmente mock),
che impattano i prezzi dei titoli e di conseguenza i portafogli.

---

## 2. Architettura

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TV Dashboard   │  │ Player Interface│  │Master Interface │
│  (React + TS)   │  │  (React + TS)   │  │  (React + TS)   │
└───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │ HTTP REST API
                    ┌────────┴────────┐
                    │   FastAPI        │
                    │   (Python)       │
                    ├──────────────────┤
                    │  Game Engine     │
                    │  Portfolio Mgmt  │
                    │  Event Mgmt      │
                    │  Impact Engine   │
                    │  LLM Mock        │
                    ├──────────────────┤
                    │   SQLite DB      │
                    │   (game.db)      │
                    └──────────────────┘
```

---

## 3. Backend - Moduli

### 3.1 `persistence/` - Database & Repository
- **Obiettivo**: Gestione connessione SQLite, CRUD per tutte le entita'.
- **Interfaccia pubblica**:
  - `init_db()` - Crea tutte le tabelle
  - `get_db()` - Restituisce connessione DB
  - Repository per: players, securities, portfolios, trades, events, event_impacts, game_state, event_templates, securities_price_history, portfolio_history

### 3.2 `game/` - Logica di Gioco
- **Obiettivo**: Gestione stato partita, cicli, leaderboard.
- **Interfaccia pubblica**:
  - `start_game(total_cycles)` - Inizializza la partita
  - `get_game_state()` - Stato corrente
  - `advance_cycle()` - Avanza al ciclo successivo (genera eventi, applica impatti)
  - `close_decision_phase()` - Chiude la fase decisionale
  - `get_leaderboard()` - Classifica giocatori
- **Flusso**:
  1. Master clicca "Avvia Ciclo" -> backend chiama `advance_cycle()`
  2. `advance_cycle()` chiama `event_mgmt.generate_events()` -> `impact.apply_impacts()`
  3. I prezzi vengono aggiornati, i portafogli ricalcolati
  4. Lo storico viene salvato (prezzi, portafogli)
  5. Lo stato passa a "decision" (giocatori possono operare)
  6. Master clicca "Chiudi Fase" -> stato passa a "closed"

### 3.3 `portfolio/` - Gestione Portafogli
- **Obiettivo**: Gestione portafogli, ordini, validazioni.
- **Interfaccia pubblica**:
  - `get_portfolio(player_id)` - Portafoglio corrente
  - `get_portfolio_value(player_id)` - Valore totale (cash + titoli)
  - `execute_trade(player_id, security_id, type, quantity)` - Esegue BUY/SELL
  - `get_trades(player_id)` - Storico operazioni
- **Validazioni**:
  - BUY: verifica liquidita' sufficiente
  - SELL: verifica quantita' posseduta sufficiente
  - Ordini solo durante fase "decision"

### 3.4 `event_mgmt/` - Gestione Eventi
- **Obiettivo**: CRUD template eventi, orchestrazione generazione.
- **Interfaccia pubblica**:
  - `create_template(...)` / `update_template(...)` / `delete_template(...)` / `list_templates(...)`
  - `generate_events_for_cycle(cycle_number)` - Seleziona template, chiama LLM, salva eventi e impatti
- **Flusso generazione**:
  1. Seleziona template attivi (mix categorie/intensita')
  2. Raccoglie stato mercato (prezzi, settori, trend)
  3. Chiama `llm_client.generate_events_and_impacts(...)`
  4. Salva `events` e `event_impacts` nel DB

### 3.5 `impact/` - Calcolo Impatti
- **Obiettivo**: Applicare impatti degli eventi ai prezzi e portafogli.
- **Interfaccia pubblica**:
  - `apply_impacts(cycle_number)` - Legge event_impacts, aggiorna prezzi, ricalcola portafogli
  - `save_cycle_snapshot(cycle_number)` - Salva snapshot prezzi e portafogli
- **Logica impatto**:
  - Impatto per singolo titolo: moltiplicatore diretto
  - Impatto per settore: applicato a tutti i titoli del settore
  - Impatto per regione: applicato a tutti i titoli della regione
  - Impatti cumulativi (moltiplicati tra loro)

### 3.6 `llm_client/` - Modulo LLM (Mock)
- **Obiettivo**: Interfaccia verso LLM. Versione mock per v1.
- **Interfaccia pubblica**:
  ```python
  def generate_events_and_impacts(
      market_state: dict,
      securities: list[dict],
      templates: list[dict]
  ) -> list[GeneratedEvent]
  ```
- **Mock**: Genera eventi casuali coerenti con i template, impatti random ma plausibili.

---

## 4. Modello Dati (SQLite)

### Tabella `players`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Unique |
| initial_cash | REAL | Default 100000 |
| current_cash | REAL | Aggiornato ad ogni operazione |
| active | BOOLEAN | Default true |

### Tabella `securities`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | Auto-increment |
| ticker | TEXT | Unique |
| name | TEXT | |
| description | TEXT | |
| sector | TEXT | |
| region | TEXT | |
| initial_price | REAL | |
| current_price | REAL | Aggiornato ad ogni ciclo |

### Tabella `securities_price_history`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| security_id | INTEGER FK | |
| cycle_number | INTEGER | |
| price | REAL | |

### Tabella `portfolios`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| player_id | INTEGER FK | |
| security_id | INTEGER FK | |
| quantity | INTEGER | |

### Tabella `portfolio_history`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| player_id | INTEGER FK | |
| cycle_number | INTEGER | |
| total_value | REAL | cash + valore titoli |

### Tabella `trades`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| player_id | INTEGER FK | |
| security_id | INTEGER FK | |
| cycle_number | INTEGER | |
| type | TEXT | 'BUY' o 'SELL' |
| quantity | INTEGER | |
| price_at_execution | REAL | |
| timestamp | TEXT | ISO format |

### Tabella `game_state`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | Sempre 1 (singola partita) |
| current_cycle | INTEGER | 0 = setup |
| total_cycles | INTEGER | |
| status | TEXT | setup/events_generated/decision/closed/finished |

### Tabella `event_templates`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| name | TEXT | |
| description | TEXT | |
| category | TEXT | geopolitica, macroeconomia, ecc. |
| target_sector | TEXT | Opzionale |
| target_region | TEXT | Opzionale |
| intensity_level | TEXT | low/medium/high |
| active | BOOLEAN | Default true |

### Tabella `events`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| game_cycle | INTEGER | |
| template_id | INTEGER FK | Opzionale |
| title | TEXT | |
| body | TEXT | |
| category | TEXT | |
| created_at | TEXT | ISO format |

### Tabella `event_impacts`
| Colonna | Tipo | Note |
|---------|------|------|
| id | INTEGER PK | |
| event_id | INTEGER FK | |
| security_id | INTEGER | Opzionale |
| sector | TEXT | Opzionale |
| region | TEXT | Opzionale |
| impact_type | TEXT | 'multiplier' o 'delta_percent' |
| impact_value | REAL | es. 1.10 = +10%, 0.95 = -5% |

---

## 5. API Endpoints

### 5.1 Game / Dashboard
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/game/state` | Stato corrente della partita |
| GET | `/api/stocks` | Lista tutti i titoli |
| GET | `/api/stocks/{id}/history` | Storico prezzi di un titolo |
| GET | `/api/events/current` | Eventi del ciclo corrente |
| GET | `/api/player/{player_id}` | Dati giocatore + portafoglio |
| GET | `/api/player/{player_id}/trades` | Storico operazioni |
| POST | `/api/player/{player_id}/trade` | Esegui ordine (body: security_id, type, quantity) |
| GET | `/api/leaderboard` | Classifica giocatori |

### 5.2 Master
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/master/game/start` | Avvia partita (body: total_cycles) |
| POST | `/api/master/next_cycle` | Avanza ciclo (genera eventi + impatti) |
| POST | `/api/master/close_phase` | Chiudi fase decisionale |
| POST | `/api/master/players` | Crea giocatore (body: name, initial_cash) |
| GET | `/api/master/players` | Lista tutti i giocatori con portafogli |
| PATCH | `/api/master/players/{id}` | Attiva/disattiva giocatore |

### 5.3 Admin Eventi
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/admin/event-templates` | Lista template |
| POST | `/api/admin/event-templates` | Crea template |
| PUT | `/api/admin/event-templates/{id}` | Modifica template |
| DELETE | `/api/admin/event-templates/{id}` | Disattiva template (soft delete) |

---

## 6. Ciclo di Gioco - Diagramma Stati

```
SETUP  ──(master: start_game)──>  RUNNING
                                     │
                          ┌──────────┘
                          v
                   EVENTS_GENERATED ──(automatico)──> DECISION
                          ^                              │
                          │                   (master: close_phase)
                          │                              │
                          │                              v
                          └────(master: next_cycle)── CLOSED
                                                         │
                                              (se ultimo ciclo)
                                                         v
                                                     FINISHED
```

---

## 7. Frontend

### 7.1 Stack
- React 18+ con TypeScript
- Vite come build tool
- TailwindCSS per styling
- Recharts per grafici
- Axios per HTTP

### 7.2 Player Interface
- Header fisso: liquidita', valore portafoglio, performance
- Sidebar: titoli per settore con ricerca
- Centro: dettaglio titolo selezionato (prezzo, settore, grafico lineare storico)
- Tabella posizioni con valore corrente
- Storico operazioni
- Feed notizie del ciclo corrente
- Form acquisto/vendita con validazione

### 7.3 Master Interface
- Dashboard stato partita (ciclo, stato, controlli)
- Tabella giocatori con portafogli espandibili
- Classifica top/flop
- Controlli ciclo (avvia, chiudi, avanza)
- Gestione giocatori (crea, attiva/disattiva)
- Vista eventi correnti
- Lista template eventi

### 7.4 TV Dashboard
- Feed notizie full-screen con titoli grandi
- Classifica in tempo reale con variazioni
- Ticker scorrevole in basso (titoli, prezzi, variazione %)
- Design ottimizzato per grande schermo

---

## 8. Seed Data

### 8.1 Securities (~30 titoli)
Titoli fittizi distribuiti per settore (Tech, Energy, Finance, Healthcare, Industrial, Consumer) e regione (USA, Europe, Asia).

### 8.2 Event Templates (~15 template)
Template per categorie: geopolitica, macroeconomia, crisi ambientale, tech disruption, regolamentazione, cigno nero. Intensita' miste (low/medium/high).

---

## 9. Note per Sviluppo Futuro (non in v1)
- Import/export da Excel/CSV
- Integrazione LLM reale (OpenAI/Anthropic)
- Autenticazione JWT
- Indicatori tecnici avanzati (RSI, Bollinger, candlestick)
- Modello DCF e analisi Fama-French nella Master Interface
- WebSocket per aggiornamenti real-time
