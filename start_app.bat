@echo off
title SONAVITH Defective Product Report
cd /d "%~dp0backend"
echo ===================================================
echo Starting SONAVITH Defective Product Report System
echo URL: http://localhost:8008
echo API Docs: http://localhost:8008/docs
echo ===================================================
echo Opening browser...
start http://localhost:8008
echo Server running. Press Ctrl+C to stop.
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8008 --reload
pause
