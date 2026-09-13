@echo off
title WuWa Convene Simulator
echo ========================================================
echo   Starting WuWa Convene Simulator ("you a gacha addict")
echo ========================================================
echo.

cd /d "%~dp0"

:: Ensure Node.js is accessible in PATH
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [ERROR] Node.js was not found! Please install Node.js.
        pause
        exit /b 1
    )
)

:: Wait 2 seconds and open the web browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

echo Starting server on http://localhost:3000 ...
echo Close this window or press Ctrl+C to stop.
echo.

call npm run dev

pause
