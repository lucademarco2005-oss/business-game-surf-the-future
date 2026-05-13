#!/bin/bash
# Avvia backend + 3 frontend in finestre Terminal separate.
# Doppio-click dal Finder per partire.

set -e

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

echo "──────────────────────────────────────────"
echo "  Surf the Future — Avvio servizi"
echo "──────────────────────────────────────────"
echo "Project root: $PROJECT_ROOT"
echo ""

# ── Backend: requirements e seed ──────────────────────────────────
if [ ! -d "backend/__pycache__" ] && [ -f "backend/requirements.txt" ]; then
    echo "[backend] Installazione dipendenze Python…"
    python3 -m pip install -q -r backend/requirements.txt || {
        echo "ATTENZIONE: pip install ha riportato errori. Continuo lo stesso."
    }
fi

if [ ! -f "database/game.db" ]; then
    echo "[database] Seed iniziale…"
    python3 -m database.seed || {
        echo "ATTENZIONE: seed fallito. Controlla la console."
    }
fi

# ── Frontends: npm install se manca node_modules ──────────────────
for fe in player-interface master-interface tv-dashboard; do
    if [ ! -d "frontend/$fe/node_modules" ]; then
        echo "[frontend/$fe] Installazione dipendenze npm…"
        (cd "frontend/$fe" && npm install --silent) || {
            echo "ATTENZIONE: npm install fallito in frontend/$fe."
        }
    fi
done

echo ""
echo "Apro 4 finestre Terminal per i servizi…"
echo ""

# ── Apri 4 finestre Terminal con AppleScript ──────────────────────
open_in_terminal() {
    local title="$1"
    local cmd="$2"
    /usr/bin/osascript <<EOF
tell application "Terminal"
    activate
    do script "echo '── $title ──'; cd \"$PROJECT_ROOT\" && $cmd"
end tell
EOF
}

open_in_terminal "BACKEND :8000" "python3 -m uvicorn backend.main:app --reload --port 8000"
sleep 0.3
open_in_terminal "PLAYER :3001" "cd frontend/player-interface && npm run dev"
sleep 0.3
open_in_terminal "MASTER :3002" "cd frontend/master-interface && npm run dev"
sleep 0.3
open_in_terminal "TV :3003" "cd frontend/tv-dashboard && npm run dev"

echo "──────────────────────────────────────────"
echo "  Tutto avviato."
echo ""
echo "  • Backend       http://localhost:8000"
echo "  • Player        http://localhost:3001"
echo "  • Master        http://localhost:3002"
echo "  • TV Dashboard  http://localhost:3003"
echo ""
echo "  Per fermare tutto: doppio-click su stop.command"
echo "──────────────────────────────────────────"

# Lascia questa finestra aperta qualche secondo per leggere
sleep 4
