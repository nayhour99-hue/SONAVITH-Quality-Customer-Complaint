@echo off
title SONAVITH Defective Product Report System
cd /d "%~dp0"
echo ===================================================
echo Starting SONAVITH Defective Product Report System
echo Unified Web App URL : http://localhost:8000
echo Vite Dev URL       : http://localhost:5173
echo Swagger API Docs   : http://localhost:8000/docs
echo ===================================================
echo Opening browser...
start http://localhost:8000
echo Server running. Press Ctrl+C to stop.
backend\venv\Scripts\uvicorn.exe main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
pause
