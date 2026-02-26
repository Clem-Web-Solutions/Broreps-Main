# 🚇 Cloudflare Tunnels - Guide d'utilisation

Ce guide explique comment exposer vos applications en HTTPS avec Cloudflare Tunnel.

## 📋 Prérequis

### Installation de Cloudflare Tunnel

```powershell
# Via winget
winget install --id Cloudflare.cloudflared

# Ou téléchargez depuis: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

Vérifiez l'installation :
```powershell
cloudflared --version
```

---

## 🚀 Option 1 : Tunnels temporaires (Quick Tunnels)

**Avantages :**
- ✅ Rapide à démarrer
- ✅ Aucune configuration requise
- ✅ Parfait pour les tests

**Inconvénients :**
- ❌ URLs aléatoires à chaque démarrage
- ❌ Tunnels temporaires (expirent après ~24h d'inactivité)

### Utilisation

1. **Démarrer les tunnels** :
```powershell
.\start-tunnels.ps1
```

2. **Voir les URLs générées** :
Les URLs HTTPS seront affichées dans le terminal et sauvegardées dans `tunnel-urls.txt`

Exemple de sortie :
```
📡 URLs des tunnels:
===================

  🌐 Server (API): https://abc123.trycloudflare.com
  🌐 Supply (Admin): https://def456.trycloudflare.com
  🌐 Suivis (Client): https://ghi789.trycloudflare.com
```

3. **Mettre à jour vos variables d'environnement** :

**Frontend (suivis et supply)** :
```env
# suivis/.env
VITE_API_URL=https://abc123.trycloudflare.com/api
VITE_WS_URL=wss://abc123.trycloudflare.com

# supply/.env
VITE_API_URL=https://abc123.trycloudflare.com/api
VITE_WS_URL=wss://abc123.trycloudflare.com
```

**Backend** :
```env
# server/.env
CORS_ORIGIN=https://def456.trycloudflare.com,https://ghi789.trycloudflare.com
```

4. **Arrêter les tunnels** :
```powershell
.\stop-tunnels.ps1
```

Ou dans le terminal où ils tournent : `Ctrl+C`

---

## 🎯 Option 2 : Tunnels nommés (URLs fixes)

**Avantages :**
- ✅ URLs fixes (subdomains personnalisés)
- ✅ Tunnels persistants
- ✅ Peut être installé comme service Windows
- ✅ Professionnel

**Inconvénients :**
- ❌ Nécessite un domaine Cloudflare
- ❌ Configuration initiale requise

### Étape 1 : Configuration initiale

```powershell
# 1. Se connecter à Cloudflare (une seule fois)
cloudflared tunnel login

# 2. Configurer les tunnels
.\setup-tunnels-named.ps1
```

Lors de l'exécution de `setup-tunnels-named.ps1`, vous serez invité à entrer votre domaine (ex: `broreps.fr`).

Le script va créer :
- `broreps-api` → `api.broreps.fr`
- `broreps-supply` → `supply.broreps.fr`
- `broreps-suivis` → `suivis.broreps.fr`

### Étape 2 : Démarrer les tunnels

```powershell
.\start-named-tunnels.ps1
```

### Étape 3 : Mettre à jour vos variables

**Frontend** :
```env
# suivis/.env
VITE_API_URL=https://api.broreps.fr/api
VITE_WS_URL=wss://api.broreps.fr

# supply/.env
VITE_API_URL=https://api.broreps.fr/api
VITE_WS_URL=wss://api.broreps.fr
```

**Backend** :
```env
# server/.env
CORS_ORIGIN=https://supply.broreps.fr,https://suivis.broreps.fr
```

### Étape 4 : Installer comme service (optionnel)

Pour que les tunnels démarrent automatiquement au démarrage de Windows :

```powershell
# Créer le fichier de configuration
# IMPORTANT: Remplacez <UUID> par l'UUID de votre tunnel principal
# Vous pouvez le trouver avec: cloudflared tunnel list

$configContent = @"
tunnel: <UUID-du-tunnel>
credentials-file: C:\Users\$env:USERNAME\.cloudflared\<UUID>.json

ingress:
  - hostname: api.broreps.fr
    service: http://localhost:3005
  - hostname: supply.broreps.fr
    service: http://localhost:5173
  - hostname: suivis.broreps.fr
    service: http://localhost:5174
  - service: http_status:404
"@

$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
$configContent | Out-File -FilePath $configPath -Encoding UTF8

# Installer le service
cloudflared service install

# Démarrer le service
cloudflared service start

# Vérifier le statut
Get-Service cloudflared
```

---

## 🔍 Commandes utiles

### Voir les tunnels actifs (PowerShell jobs)
```powershell
Get-Job
```

### Voir les logs en temps réel
```powershell
# Tunnels temporaires
Get-Job -Name "Tunnel-*" | Receive-Job

# Tunnels nommés
Get-Job -Name "NamedTunnel-*" | Receive-Job
```

### Lister tous vos tunnels Cloudflare
```powershell
cloudflared tunnel list
```

### Voir les routes DNS configurées
```powershell
cloudflared tunnel route dns list
```

### Supprimer un tunnel
```powershell
# 1. Supprimer les routes DNS
cloudflared tunnel route dns delete <tunnel-name>

# 2. Supprimer le tunnel
cloudflared tunnel delete <tunnel-name>
```

### Arrêter le service Windows
```powershell
Stop-Service cloudflared
```

---

## 📊 Tableau récapitulatif

| Application | Port Local | Tunnel Temporaire | Tunnel Nommé |
|-------------|-----------|-------------------|--------------|
| **Server (API)** | 3005 | `*.trycloudflare.com` | `api.votre-domaine.com` |
| **Supply (Admin)** | 5173 | `*.trycloudflare.com` | `supply.votre-domaine.com` |
| **Suivis (Client)** | 5174 | `*.trycloudflare.com` | `suivis.votre-domaine.com` |

---

## 🔐 Sécurité

### Avantages Cloudflare Tunnel
- ✅ **Pas de ports ouverts** sur votre machine
- ✅ **Chiffrement automatique** HTTPS/WSS
- ✅ **Protection DDoS** de Cloudflare
- ✅ **Masquage de votre IP** publique
- ✅ **Certificat SSL automatique** (Let's Encrypt via Cloudflare)

### Recommandations
- 🔒 Utilisez les tunnels nommés en production
- 🔒 Activez l'authentification Cloudflare Access (optionnel)
- 🔒 Limitez l'accès par email/IP dans le dashboard Cloudflare

---

## 🚨 Troubleshooting

### "cloudflared: command not found"
Solution : Installez cloudflared (voir Prérequis ci-dessus)

### Les tunnels se ferment après quelques minutes
- Vérifiez que vos applications (server, supply, suivis) sont bien démarrées
- Les tunnels se ferment si l'application locale ne répond pas

### "cert.pem" introuvable
Solution : Exécutez `cloudflared tunnel login` pour vous authentifier

### Les URLs changent à chaque démarrage
- C'est normal pour les quick tunnels (tunnels temporaires)
- Utilisez les tunnels nommés pour des URLs fixes

### CORS errors après avoir changé d'URL
Solution : Mettez à jour `CORS_ORIGIN` dans `server/.env` avec les nouvelles URLs

### WebSocket ne fonctionne pas
Solution : 
1. Vérifiez que la variable `VITE_WS_URL` commence par `wss://` (pas `ws://`)
2. Cloudflare Tunnel supporte WebSocket nativement

---

## 📦 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `start-tunnels.ps1` | Démarre les tunnels temporaires (quick tunnels) |
| `start-named-tunnels.ps1` | Démarre les tunnels nommés (URLs fixes) |
| `stop-tunnels.ps1` | Arrête tous les tunnels actifs |
| `setup-tunnels-named.ps1` | Configure les tunnels nommés (première fois) |
| `tunnel-urls.txt` | URLs générées (créé automatiquement) |
| `tunnel-logs/` | Dossier contenant les logs (créé automatiquement) |

---

## 💡 Workflow recommandé

### Pour le développement local
1. Démarrez vos applications :
   ```powershell
   # Terminal 1
   cd server; npm run dev
   
   # Terminal 2
   cd supply; npm run dev
   
   # Terminal 3
   cd suivis; npm run dev
   ```

2. Démarrez les tunnels temporaires :
   ```powershell
   # Terminal 4
   .\start-tunnels.ps1
   ```

3. Copiez les URLs et mettez à jour vos `.env` si nécessaire

### Pour la production / démo client
1. Configurez les tunnels nommés une seule fois
2. Installez comme service Windows
3. Les tunnels démarrent automatiquement

---

## 🌐 Alternatives à Cloudflare Tunnel

- **ngrok** : Payant pour plusieurs tunnels simultanés
- **localtunnel** : Moins stable, URLs expirables
- **serveo** : SSH tunneling, nécessite un serveur
- **localhost.run** : Similaire à serveo
- **Cloudflare Tunnel** : ✅ **Gratuit, stable, illimité** (recommandé)

---

✅ **Vos applications sont maintenant accessibles en HTTPS depuis n'importe où !** 🚀
