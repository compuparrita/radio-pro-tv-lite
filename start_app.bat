@echo off
title Chat System Launcher
color 0A
echo ==========================================
echo    Iniciando Sistema de Chat Obaflet
echo ==========================================

echo.
echo 1. Iniciando Servidor Backend (Puerto 3001)...
start "Backend Server" cmd /k "cd server && node index.js"

echo.
echo 2. Iniciando Frontend (Vite)...
start "Frontend Client" cmd /k "npm run dev"

echo.
echo ==========================================
echo    Sistemas iniciados correctamente
echo ==========================================
echo.
echo Por favor no cierre las ventanas que se han abierto.
echo El sistema estara disponible en:
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:3001
echo.
pause
