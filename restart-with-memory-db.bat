@echo off
echo Stopping server on port 3003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do taskkill /PID %%a /F 2>nul
timeout /t 2 /nobreak >nul

echo Starting server with memory database...
node server.js