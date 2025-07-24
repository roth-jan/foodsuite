@echo off
echo Stopping Node.js processes on port 3003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do (
    echo Killing process %%a
    taskkill /PID %%a /F
)
echo Done.