@echo off
title DataCraft AI - Launcher
echo.
echo  =============================================
echo   DataCraft AI - Project Launcher
echo  =============================================
echo.
echo  This project needs TWO terminal windows running at once:
echo.
echo    Terminal 1 (API Server):   run start-api.bat
echo    Terminal 2 (Frontend):     run start-frontend.bat
echo.
echo  Quick start:
echo  ------------
echo  1. Double-click start-api.bat      (keep it running)
echo  2. Double-click start-frontend.bat (keep it running)
echo  3. Open http://localhost:5173 in your browser
echo.
echo  First time setup:
echo  -----------------
echo  1. Copy .env.example to .env
echo  2. Add your VITE_CLERK_PUBLISHABLE_KEY from https://dashboard.clerk.com
echo  3. Add at least one AI key (GEMINI, GROQ, or OPENROUTER)
echo  4. Run: pip install -r requirements.txt
echo  5. Run: pnpm install
echo.
echo  Opening both terminals now...
echo.

start "DataCraft AI - API Server" cmd /k "%~dp0start-api.bat"
timeout /t 3 /nobreak > nul
start "DataCraft AI - Frontend" cmd /k "%~dp0start-frontend.bat"

echo  Both servers are starting in separate windows.
echo  Open http://localhost:5173 when both show "ready".
echo.
pause
