# Configuration avancée : Tunnels Cloudflare nommés (URLs fixes)
# Ce guide explique comment configurer des tunnels avec URLs fixes
# ============================================================================

# ÉTAPE 1: Authentification Cloudflare
# ======================================
# Exécutez cette commande une seule fois pour vous authentifier:
cloudflared tunnel login

# Cela ouvrira votre navigateur pour autoriser Cloudflare
# Un certificat sera sauvegardé dans: C:\Users\<username>\.cloudflared\cert.pem


# ÉTAPE 2: Créer les tunnels nommés
# ====================================
cloudflared tunnel create broreps-api
cloudflared tunnel create broreps-supply
cloudflared tunnel create broreps-suivis

# Note: Gardez les UUID générés, ils seront dans les fichiers JSON créés


# ÉTAPE 3: Lister vos tunnels
# ============================
cloudflared tunnel list


# ÉTAPE 4: Créer le fichier de configuration
# ===========================================
# Créez le fichier: C:\Users\<username>\.cloudflared\config.yml

<#
tunnel: <UUID-du-tunnel-api>
credentials-file: C:\Users\<username>\.cloudflared\<UUID>.json

ingress:
  # API Server (port 3005)
  - hostname: api.votre-domaine.com
    service: http://localhost:3005
  
  # Supply Admin (port 5173)
  - hostname: supply.votre-domaine.com
    service: http://localhost:5173
  
  # Suivis Client (port 5174)
  - hostname: suivis.votre-domaine.com
    service: http://localhost:5174
  
  # Catch-all rule (obligatoire)
  - service: http_status:404
#>


# ÉTAPE 5: Configurer le DNS
# ===========================
# Pour chaque tunnel, créez un enregistrement DNS CNAME:

cloudflared tunnel route dns broreps-api api.votre-domaine.com
cloudflared tunnel route dns broreps-supply supply.votre-domaine.com
cloudflared tunnel route dns broreps-suivis suivis.votre-domaine.com


# ÉTAPE 6: Démarrer les tunnels
# ==============================
# Démarrer un tunnel:
cloudflared tunnel run broreps-api

# Ou démarrer avec le fichier de config:
cloudflared tunnel --config C:\Users\<username>\.cloudflared\config.yml run


# ÉTAPE 7: Installer comme service Windows (optionnel)
# =====================================================
cloudflared service install
cloudflared service start


# ============================================================================
# SCRIPT AUTOMATISÉ POUR TUNNELS NOMMÉS
# ============================================================================

# Fonction pour creer et configurer les tunnels automatiquement
function Setup-CloudflareTunnels {
    Write-Host "[*] Configuration des tunnels Cloudflare" -ForegroundColor Cyan
    Write-Host ""
    
    # Verifier l'authentification
    $certPath = "$env:USERPROFILE\.cloudflared\cert.pem"
    if (-not (Test-Path $certPath)) {
        Write-Host "[ERREUR] Vous devez d'abord vous authentifier" -ForegroundColor Red
        Write-Host "   Executez: cloudflared tunnel login" -ForegroundColor Yellow
        return
    }
    
    # Configuration des tunnels
    $tunnels = @(
        @{ Name = "broreps-api"; Port = 3005; Hostname = "api" },
        @{ Name = "broreps-supply"; Port = 5173; Hostname = "supply" },
        @{ Name = "broreps-suivis"; Port = 5174; Hostname = "suivis" }
    )
    
    Write-Host "[INPUT] Domaine racine (ex: broreps.fr):" -ForegroundColor Yellow
    $domain = Read-Host
    
    Write-Host ""
    Write-Host "[*] Creation des tunnels..." -ForegroundColor Cyan
    
    foreach ($tunnel in $tunnels) {
        Write-Host "  - Creation de $($tunnel.Name)..." -ForegroundColor Gray
        
        # Creer le tunnel
        $output = cloudflared tunnel create $tunnel.Name 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Tunnel cree" -ForegroundColor Green
            
            # Configurer le DNS
            $fullHostname = "$($tunnel.Hostname).$domain"
            Write-Host "    [DNS] Configuration DNS: $fullHostname" -ForegroundColor Gray
            cloudflared tunnel route dns $tunnel.Name $fullHostname
            
        } else {
            Write-Host "    [WARN] Le tunnel existe peut-etre deja" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "[OK] Configuration terminee!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] URLs configurees:" -ForegroundColor Cyan
    foreach ($tunnel in $tunnels) {
        Write-Host "  - https://$($tunnel.Hostname).$domain -> localhost:$($tunnel.Port)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "[NEXT] Pour demarrer les tunnels, utilisez:" -ForegroundColor Yellow
    Write-Host "   .\start-named-tunnels.ps1" -ForegroundColor White
}

# Décommenter pour exécuter la configuration:
# Setup-CloudflareTunnels
