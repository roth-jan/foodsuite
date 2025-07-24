# Stop server on port 3003
Write-Host "Stopping server on port 3003..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start server with memory database
Write-Host "Starting server with memory database..." -ForegroundColor Green
$env:DB_TYPE = "memory"
Start-Process node -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -NoNewWindow