@echo off
title DataCraft AI - Frontend
echo.
echo  =============================================
echo   DataCraft AI - React Frontend
echo  =============================================
echo.

cd /d "%~dp0"

if not exist ".env" (
    echo  [ERROR] .env file not found!
    echo  Please copy .env.example to .env and fill in your API keys.
    echo.
    echo  Required: VITE_CLERK_PUBLISHABLE_KEY
    echo  Get it from: https://dashboard.clerk.com
    echo.
    pause
    exit /b 1
)

echo  Starting frontend on http://localhost:5173
echo  Press Ctrl+C to stop.
echo.

pnpm --filter @workspace/ai-sql-generator run dev

pause
