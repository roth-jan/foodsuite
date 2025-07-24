@echo off
echo === Claude Session Monitor ===
echo Logging to: claude-sessions.log
echo.

:monitor
echo [%DATE% %TIME%] Checking Claude sessions... >> claude-sessions.log
tasklist | findstr "claude node" >> claude-sessions.log
echo ---------------------------------------- >> claude-sessions.log

timeout /t 30 /nobreak > nul
goto monitor