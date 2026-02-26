# Script pour arreter tous les tunnels Cloudflare
# Usage: .\stop-tunnels.ps1

Write-Host "[STOP] Arret des tunnels Cloudflare" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

# Arreter tous les jobs PowerShell des tunnels
$jobs = Get-Job | Where-Object { $_.Name -like "Tunnel-*" }

if ($jobs.Count -eq 0) {
    Write-Host "[INFO] Aucun tunnel en cours d'execution" -ForegroundColor Gray
} else {
    Write-Host "[*] Arret de $($jobs.Count) tunnel(s)..." -ForegroundColor Yellow
    
    foreach ($job in $jobs) {
        Write-Host "  - Arret du $($job.Name)..." -ForegroundColor Gray
        Stop-Job -Job $job
        Remove-Job -Job $job
    }
    
    Write-Host ""
    Write-Host "[OK] Tous les tunnels ont ete arretes" -ForegroundColor Green
}

# Arreter les processus cloudflared orphelins
$cloudflaredProcesses = Get-Process cloudflared -ErrorAction SilentlyContinue

if ($cloudflaredProcesses) {
    Write-Host ""
    Write-Host "[*] Nettoyage des processus cloudflared orphelins..." -ForegroundColor Yellow
    
    foreach ($process in $cloudflaredProcesses) {
        Stop-Process -Id $process.Id -Force
        Write-Host "  - Processus $($process.Id) arrete" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[OK] Processus cloudflared nettoyes" -ForegroundColor Green
}

Write-Host ""
Write-Host "[DONE] Termine!" -ForegroundColor Cyan
