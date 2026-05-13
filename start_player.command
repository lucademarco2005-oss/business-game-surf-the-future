#!/bin/bash
# Avvia il PLAYER INTERFACE sulla porta 3001.
# Accessibile da localhost E da chiunque sia connesso alla stessa rete locale.
# Richiede che il BACKEND sia gia' partito (start_backend.command).

cd "$(dirname "$0")/frontend/player-interface"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")"

echo "──────────────────────────────────────────────"
echo "  PLAYER INTERFACE — Surf the Future"
echo "──────────────────────────────────────────────"
echo "  Locale:  http://localhost:3001"
if [ -n "$LAN_IP" ]; then
echo "  Rete:    http://$LAN_IP:3001"
echo ""
echo "  → Condividi questo link con chi e' sulla tua rete"
else
echo "  Rete:    (nessun IP rilevato sulla LAN)"
fi
echo "──────────────────────────────────────────────"
echo ""

if [ ! -d "node_modules" ]; then
    echo "[setup] Installazione dipendenze npm…"
    npm install || {
        echo "ERRORE: npm install fallito."
        echo "Premi INVIO per chiudere."
        read
        exit 1
    }
fi

echo ""
echo "Avvio Player Interface… (Ctrl+C per fermare)"
echo ""
exec npm run dev
