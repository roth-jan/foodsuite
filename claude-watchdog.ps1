# Claude Watchdog - PowerShell Version
# Überwacht Claude-Prozesse und startet sie automatisch neu

$logFile = "claude-watchdog.log"
$crashCount = 0
$maxCrashes = 10
$crashTimeWindow = 300 # 5 Minuten

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Claude Watchdog gestartet"

while ($true) {
    # Check if Claude is running
    $claudeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
        Where-Object { $_.CommandLine -like "*claude*" }
    
    if ($claudeProcesses.Count -eq 0) {
        Write-Log "WARNUNG: Keine Claude-Prozesse gefunden!"
        
        # Check crash frequency
        $recentCrashes = Get-Content $logFile -Tail 50 | 
            Select-String "CRASH" | 
            Where-Object { $_.Line -match "(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})" }
        
        $recentCrashTime = $recentCrashes | 
            ForEach-Object { [DateTime]::Parse($Matches[1]) } | 
            Where-Object { $_ -gt (Get-Date).AddSeconds(-$crashTimeWindow) }
        
        if ($recentCrashTime.Count -ge $maxCrashes) {
            Write-Log "KRITISCH: Zu viele Abstürze ($($recentCrashTime.Count)) in den letzten 5 Minuten!"
            Write-Log "Watchdog beendet sich selbst. Manuelle Intervention erforderlich."
            break
        }
        
        Write-Log "CRASH DETECTED! Starte Claude neu..."
        $crashCount++
        
        # Kill any hanging processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
        
        Start-Sleep -Seconds 2
        
        # Restart Claude with debugging
        $env:NODE_ENV = "development"
        $env:DEBUG = "*"
        $env:CLAUDE_LOG_LEVEL = "debug"
        
        Start-Process -FilePath "claude" -NoNewWindow -RedirectStandardOutput "claude-output.log" -RedirectStandardError "claude-error.log"
        
        Write-Log "Claude neu gestartet (Crash #$crashCount)"
        Start-Sleep -Seconds 10
    }
    else {
        # Monitor memory usage
        $totalMemory = 0
        foreach ($proc in $claudeProcesses) {
            $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            $totalMemory += $memoryMB
            
            if ($memoryMB -gt 1000) {
                Write-Log "WARNUNG: Prozess $($proc.Id) nutzt $memoryMB MB RAM!"
            }
        }
        
        if ($totalMemory -gt 2000) {
            Write-Log "KRITISCH: Gesamtspeichernutzung bei $totalMemory MB!"
        }
    }
    
    Start-Sleep -Seconds 30
}