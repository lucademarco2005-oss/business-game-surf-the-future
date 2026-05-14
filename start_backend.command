#!/bin/bash
# Avvia il BACKEND (FastAPI) sulla porta 8003.
# Accessibile da localhost E da chiunque sia connesso alla stessa rete locale.

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

# IP locale (Wi-Fi en0, fallback en1)
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")"

echo "──────────────────────────────────────────────"
echo "  BACKEND — Surf the Future"
echo "──────────────────────────────────────────────"
echo "  Locale:  http://localhost:8003"
echo "  Docs:    http://localhost:8003/docs"
if [ -n "$LAN_IP" ]; then
echo "  Rete:    http://$LAN_IP:8003"
echo ""
echo "  → Altri sulla tua rete devono usare l'IP $LAN_IP"
else
echo "  Rete:    (nessun IP rilevato sulla LAN)"
fi
echo "──────────────────────────────────────────────"
echo ""

# Dipendenze Python: installa se mancanti
if ! python3 -c "import fastapi, uvicorn, h11" >/dev/null 2>&1; then
    echo "[setup] Installazione dipendenze Python…"
    python3 -m pip install -q -r backend/requirements.txt h11 || {
        echo "ERRORE: pip install fallito."
        echo "Premi INVIO per chiudere."
        read
        exit 1
    }
fi

# DB: seed se mancante
if [ ! -f "database/game.db" ]; then
    echo "[setup] Seed iniziale del database…"
    python3 -m database.seed
fi

echo ""
echo "Avvio backend… (Ctrl+C per fermare)"
echo ""
exec python3 run_server.py
