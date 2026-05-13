#!/bin/bash
# Ferma TUTTI i servizi: backend (8003) + player (3001) + master (3002) + tv (3003).
# Termina i processi sulle 4 porte.

echo "──────────────────────────────────────────────"
echo "  STOP — Surf the Future"
echo "──────────────────────────────────────────────"

PORTS="8003 3001 3002 3003"
ANY_KILLED=0

for port in $PORTS; do
    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "  Porta $port → kill PID(s): $pids"
        kill $pids 2>/dev/null || true
        sleep 0.2
        pids=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
        ANY_KILLED=1
    else
        echo "  Porta $port → nessun processo attivo"
    fi
done

echo ""
if [ "$ANY_KILLED" -eq 1 ]; then
    echo "  Tutti i servizi fermati."
else
    echo "  Nessun servizio era in esecuzione."
fi
echo "──────────────────────────────────────────────"

sleep 2
