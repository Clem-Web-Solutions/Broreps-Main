# Script pour demarrer les tunnels Cloudflare NOMMES (URLs fixes)
# Prerequis: Avoir execute setup-tunnels-named.ps1 d'abord
# Usage: .\start-named-tunnels.ps1

Write-Host "[*] Demarrage des tunnels Cloudflare nommes" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration des tunnels
$tunnels = @(
    @{ Name = "broreps-api"; Port = 3005; Description = "Server (API)" },
    @{ Name = "broreps-supply"; Port = 5173; Description = "Supply (Admin)" },
    @{ Name = "broreps-suivis"; Port = 5174; Description = "Suivis (Client)" }
)

Write-Host "[CHECK] Verification des tunnels..." -ForegroundColor Yellow

# Lister les tunnels existants
$existingTunnels = cloudflared tunnel list 2>&1 | Out-String

$allExist = $true
foreach ($tunnel in $tunnels) {
    if ($existingTunnels -match $tunnel.Name) {
        Write-Host "  [OK] $($tunnel.Name) existe" -ForegroundColor Green
    } else {
        Write-Host "  [ERREUR] $($tunnel.Name) n'existe pas" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host ""
    Write-Host "[WARN] Certains tunnels n'existent pas!" -ForegroundColor Yellow
    Write-Host "   Executez d'abord: .\setup-tunnels-named.ps1" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "[START] Demarrage des tunnels..." -ForegroundColor Cyan
Write-Host ""

$jobs = @()

foreach ($tunnel in $tunnels) {
    Write-Host "  [*] Demarrage de $($tunnel.Description) ($($tunnel.Name))..." -ForegroundColor Gray
    
    # Demarrer le tunnel en arriere-plan
    $job = Start-Job -Name "NamedTunnel-$($tunnel.Name)" -ScriptBlock {
        param($tunnelName)
        cloudflared tunnel run $tunnelName
    } -ArgumentList $tunnel.Name
    
    $jobs += @{
        Job = $job
        Name = $tunnel.Name
        Description = $tunnel.Description
        Port = $tunnel.Port
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "[OK] Tunnels demarres!" -ForegroundColor Green
Write-Host ""

Write-Host "[INFO] Tunnels actifs:" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
foreach ($jobInfo in $jobs) {
    Write-Host "  - $($jobInfo.Description) ($($jobInfo.Name)) - Port $($jobInfo.Port)" -ForegroundColor White
}

Write-Host ""
Write-Host "[INFO] Commandes utiles:" -ForegroundColor Cyan
Write-Host "  - Voir les tunnels actifs:   Get-Job" -ForegroundColor Gray
Write-Host "  - Voir les logs:             Get-Job -Name 'NamedTunnel-*' | Receive-Job" -ForegroundColor Gray
Write-Host "  - Arreter les tunnels:       .\stop-tunnels.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "[WATCH] Surveillance des tunnels... (Ctrl+C pour arreter)" -ForegroundColor Green
Write-Host ""

# Surveiller les jobs
try {
    while ($true) {
        $runningJobs = Get-Job | Where-Object { $_.Name -like "NamedTunnel-*" -and $_.State -eq "Running" }
        
        if ($runningJobs.Count -lt $jobs.Count) {
            Write-Host ""
            Write-Host "[WARN] Certains tunnels se sont arretes!" -ForegroundColor Yellow
            
            foreach ($jobInfo in $jobs) {
                $jobState = (Get-Job -Id $jobInfo.Job.Id).State
                $icon = if ($jobState -eq "Running") { "[OK]" } else { "[ERR]" }
                Write-Host "  $icon $($jobInfo.Description): $jobState" -ForegroundColor $(if ($jobState -eq "Running") { "Green" } else { "Red" })
            }
            
            break
        }
        
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host ""
    Write-Host "[STOP] Arret des tunnels..." -ForegroundColor Yellow
    
    Get-Job | Where-Object { $_.Name -like "NamedTunnel-*" } | Stop-Job
    Get-Job | Where-Object { $_.Name -like "NamedTunnel-*" } | Remove-Job
    
    Write-Host "[OK] Tunnels arretes" -ForegroundColor Green
    Write-Host ""
}
