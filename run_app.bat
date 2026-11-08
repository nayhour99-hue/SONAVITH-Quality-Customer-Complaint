@echo off
title SONAVITH Defective Product Report System
setlocal enabledelayedexpansion

cd /d "%~dp0"
echo ========================================================
echo   Starting SONAVITH Quality Defective Product Report
echo ========================================================
echo.

:: Detect Python executable
set "PY_EXE="
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\venv\Scripts\python.exe"
) else if exist "%USERPROFILE%\anaconda3\python.exe" (
    set "PY_EXE=%USERPROFILE%\anaconda3\python.exe"
) else (
    for /f "tokens=*" %%i in ('where python 2^>nul') do (
        if not defined PY_EXE set "PY_EXE=%%i"
    )
)

if not defined PY_EXE (
    echo [ERROR] Python not found. Please install Python.
    pause
    exit /b 1
)

echo [1/3] Using Python: !PY_EXE!

:: Ensure dependencies are present
echo [2/3] Checking dependencies...
"!PY_EXE!" -m pip install -r "backend\requirements.txt" --quiet

:: Start Unified Server on http://localhost:8000
echo [3/3] Launching web application on http://localhost:8000 ...
echo.
echo ========================================================
echo   Web App URL : http://localhost:8000
echo   Swagger Docs: http://localhost:8000/docs
echo ========================================================
echo.
echo Opening browser...
start http://localhost:8000

cd /d "%~dp0backend"
"!PY_EXE!" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause

