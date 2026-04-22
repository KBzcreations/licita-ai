@echo off
REM Licita AI - Script de inicio rapido para Windows
echo ======================================
echo   Licita AI - Development Server
echo ======================================
echo.

REM Iniciar backend en ventana separada
echo [1/2] Iniciando backend en http://localhost:8000
start "Licita AI - Backend" cmd /k "cd /d %~dp0 && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Esperar a que el backend arranque
timeout /t 3 /nobreak >nul

REM Iniciar frontend
echo [2/2] Iniciando frontend en http://localhost:5173
cd frontend
start "Licita AI - Frontend" cmd /k "npm run dev"

echo.
echo ======================================
echo   Servidores iniciados correctamente
echo ======================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
echo   Cierra las ventanas para detener
echo ======================================
