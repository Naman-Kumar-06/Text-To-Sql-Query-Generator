@echo off
title DataCraft AI - API Server
echo.
echo  =============================================
echo   DataCraft AI - Python API Server
echo  =============================================
echo.

cd /d "%~dp0artifacts\api-server\python"

if not exist "data\uploads" mkdir "data\uploads"
if not exist "data\exports" mkdir "data\exports"

echo  Starting API server on http://localhost:8000
echo  API docs available at http://localhost:8000/docs
echo  Press Ctrl+C to stop.
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
