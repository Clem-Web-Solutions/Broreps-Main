# Script pour demarrer les tunnels Cloudflare pour toutes les applications
# Usage: .\start-tunnels.ps1

Write-Host "[*] Demarrage des tunnels Cloudflare" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que cloudflared est installe
try {
    $cloudflaredVersion = cloudflared --version
    Write-Host "[OK] Cloudflare Tunnel installe: $cloudflaredVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Cloudflare Tunnel n'est pas installe" -ForegroundColor Red
    Write-Host "   Installez-le avec: winget install --id Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Configuration des tunnels
$tunnels = @(
    @{
        Name = "Server (API)"
        Port = 3005
        Color = "Green"
    },
    @{
        Name = "Supply (Admin)"
        Port = 5173
        Color = "Blue"
    },
    @{
        Name = "Suivis (Client)"
        Port = 5174
        Color = "Magenta"
    }
)

Write-Host "[CONFIG] Configuration des tunnels:" -ForegroundColor Yellow
foreach ($tunnel in $tunnels) {
    Write-Host "  - $($tunnel.Name): http://localhost:$($tunnel.Port)" -ForegroundColor $tunnel.Color
}
Write-Host ""

# Creer le dossier pour les logs
$logsDir = Join-Path $PSScriptRoot "tunnel-logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Tableau pour stocker les jobs
$jobs = @()

Write-Host "[START] Demarrage des tunnels..." -ForegroundColor Cyan
Write-Host ""

foreach ($tunnel in $tunnels) {
    $logFile = Join-Path $logsDir "tunnel-$($tunnel.Port).log"
    
    Write-Host "  [*] Demarrage du tunnel pour $($tunnel.Name) (port $($tunnel.Port))..." -ForegroundColor $tunnel.Color
    
    # Demarrer cloudflared en arriere-plan
    $job = Start-Job -Name "Tunnel-$($tunnel.Port)" -ScriptBlock {
        param($port, $logFile)
        
        # Rediriger la sortie vers le fichier log
        cloudflared tunnel --url http://localhost:$port 2>&1 | Tee-Object -FilePath $logFile
    } -ArgumentList $tunnel.Port, $logFile
    
    $jobs += @{
        Job = $job
        Name = $tunnel.Name
        Port = $tunnel.Port
        Color = $tunnel.Color
        LogFile = $logFile
    }
    
    # Petite pause pour laisser le tunnel démarrer
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "[WAIT] Attente de l'initialisation des tunnels (10 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[OK] Tunnels demarres!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] URLs des tunnels:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Extraire les URLs des logs
foreach ($jobInfo in $jobs) {
    $logContent = Get-Content $jobInfo.LogFile -ErrorAction SilentlyContinue
    $url = $logContent | Select-String -Pattern "https://.*\.trycloudflare\.com" | Select-Object -First 1
    
    if ($url) {
        $cleanUrl = $url.Line -replace '.*?(https://[^\s]+).*', '$1'
        Write-Host "  [URL] $($jobInfo.Name): " -NoNewline -ForegroundColor $jobInfo.Color
        Write-Host "$cleanUrl" -ForegroundColor White
        
        # Sauvegarder l'URL dans un fichier
        $urlFile = Join-Path $PSScriptRoot "tunnel-urls.txt"
        "$($jobInfo.Name) (Port $($jobInfo.Port)): $cleanUrl" | Add-Content -Path $urlFile
    } else {
        Write-Host "  [WARN] $($jobInfo.Name): URL non trouvee (verifiez le log)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[SAVE] URLs sauvegardees dans: tunnel-urls.txt" -ForegroundColor Yellow
Write-Host "[LOG] Logs disponibles dans: tunnel-logs/" -ForegroundColor Yellow
Write-Host ""

Write-Host "[INFO] Commandes utiles:" -ForegroundColor Cyan
Write-Host "  - Voir les tunnels actifs:   Get-Job" -ForegroundColor Gray
Write-Host "  - Voir les logs d'un tunnel: Get-Job -Name 'Tunnel-3005' | Receive-Job" -ForegroundColor Gray
Write-Host "  - Arreter tous les tunnels:  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Gray
Write-Host "  - Arreter ce script:         Ctrl+C" -ForegroundColor Gray
Write-Host ""

Write-Host "[WATCH] Surveillance des tunnels en cours... (Ctrl+C pour arreter)" -ForegroundColor Green
Write-Host ""

# Surveiller les jobs
try {
    while ($true) {
        # Verifier si tous les jobs sont toujours en cours
        $runningJobs = Get-Job | Where-Object { $_.State -eq "Running" }
        
        if ($runningJobs.Count -lt $jobs.Count) {
            Write-Host ""
            Write-Host "[WARN] Certains tunnels se sont arretes!" -ForegroundColor Yellow
            
            foreach ($jobInfo in $jobs) {
                $jobState = (Get-Job -Id $jobInfo.Job.Id).State
                if ($jobState -ne "Running") {
                    Write-Host "  [ERREUR] $($jobInfo.Name) (port $($jobInfo.Port)): $jobState" -ForegroundColor Red
                }
            }
            
            Write-Host ""
            Write-Host "[INFO] Verifiez les logs dans tunnel-logs/ pour plus de details" -ForegroundColor Yellow
            break
        }
        
        # Attendre 5 secondes avant la prochaine verification
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host ""
    Write-Host "[STOP] Arret des tunnels..." -ForegroundColor Yellow
    
    # Nettoyer les jobs
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    
    Write-Host "[OK] Tunnels arretes" -ForegroundColor Green
    Write-Host ""
}
