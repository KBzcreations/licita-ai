#!/bin/bash
echo "========================================"
echo "LICITA AI - Iniciando todos los servicios"
echo "========================================"
echo ""

# Iniciar API FastAPI en background
echo "[1/2] Iniciando API FastAPI en http://localhost:8000"
python main.py &
API_PID=$!

# Esperar un momento para que la API arranque
sleep 2

# Iniciar Frontend
echo "[2/2] Iniciando Frontend React en http://localhost:5173"
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Servicios iniciados:"
echo "  - API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo "  - Frontend: http://localhost:5173"
echo "========================================"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar a que los procesos terminen
wait $API_PID $FRONTEND_PID
