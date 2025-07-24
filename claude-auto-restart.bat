@echo off
setlocal EnableDelayedExpansion
echo Claude Auto-Restart System v2.0
echo ================================
echo.

:RESTART_LOOP
echo [%date% %time%] Starting Claude session...
echo [%date% %time%] Starting Claude session... >> claude-restart.log

REM Start Monitor in background
start /B claude-monitor.bat

REM Run Claude with full debugging
set NODE_ENV=development
set DEBUG=*
set CLAUDE_LOG_LEVEL=debug

echo Running Claude...
claude 2>&1 | powershell -Command "$input | Tee-Object -FilePath 'claude-debug-full.log' -Append | Write-Output"

echo.
echo [%date% %time%] Claude session ended with exit code: %ERRORLEVEL%
echo [%date% %time%] Claude session ended with exit code: %ERRORLEVEL% >> claude-restart.log

REM Check for normal exit (Ctrl+C = exit code 130)
if %ERRORLEVEL% == 130 (
    echo User requested exit. Stopping auto-restart.
    goto :END
)

REM Any other exit code = crash
echo CRASH DETECTED! Restarting in 5 seconds...
echo [%date% %time%] CRASH DETECTED! Restarting... >> claude-restart.log

REM Kill any hanging node processes
taskkill /F /IM node.exe >nul 2>&1

REM Wait before restart
timeout /t 5 /nobreak

goto :RESTART_LOOP

:END
echo.
echo Auto-restart stopped.
pause