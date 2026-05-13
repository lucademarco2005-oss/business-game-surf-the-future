#!/bin/bash
# Avvia il MASTER INTERFACE sulla porta 3002.
# Accessibile da localhost E da chiunque sia connesso alla stessa rete locale.
# Richiede che il BACKEND sia gia' partito (start_backend.command).

cd "$(dirname "$0")/frontend/master-interface"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")"

echo "──────────────────────────────────────────────"
echo "  MASTER INTERFACE — Surf the Future"
echo "──────────────────────────────────────────────"
echo "  Locale:  http://localhost:3002"
if [ -n "$LAN_IP" ]; then
echo "  Rete:    http://$LAN_IP:3002"
echo ""
echo "  → Console di controllo del game master"
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
echo "Avvio Master Interface… (Ctrl+C per fermare)"
echo ""
exec npm run dev
