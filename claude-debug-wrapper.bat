@echo off
echo === Claude Debug Wrapper ===
echo Alle Ausgaben werden in claude-debug-full.log gespeichert
echo.

set CLAUDE_DEBUG=1
set CLAUDE_LOG_LEVEL=debug

echo [%DATE% %TIME%] Claude Session gestartet >> claude-debug-full.log
echo ================================== >> claude-debug-full.log

claude --verbose %* 2>&1 | tee -a claude-debug-full.log

echo [%DATE% %TIME%] Claude Session beendet (Exit Code: %ERRORLEVEL%) >> claude-debug-full.log
echo ================================== >> claude-debug-full.log