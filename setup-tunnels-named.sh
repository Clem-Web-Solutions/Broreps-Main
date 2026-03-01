#!/bin/bash

# Script pour configurer les tunnels Cloudflare NOMMÉS (URLs fixes)
# Prérequis: Compte Cloudflare et cloudflared installé + authentifié
# Usage: ./setup-tunnels-named.sh

echo -e "\033[36m[*] Configuration des tunnels Cloudflare nommés\033[0m"
echo "==============================================="
echo ""

# Vérifier que cloudflared est installé
if ! command -v cloudflared &> /dev/null; then
    echo -e "\033[31m[ERREUR] Cloudflare Tunnel n'est pas installé\033[0m"
    echo -e "   Installez-le avec:"
    echo -e "   - macOS: brew install cloudflare/cloudflare/cloudflared"
    echo -e "   - Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
fi

echo -e "\033[32m[OK] Cloudflare Tunnel installé\033[0m"
echo ""

# Vérifier l'authentification
echo -e "\033[33m[CHECK] Vérification de l'authentification...\033[0m"
if ! cloudflared tunnel list &> /dev/null; then
    echo -e "\033[31m[ERREUR] Vous n'êtes pas authentifié\033[0m"
    echo ""
    echo -e "\033[33m[INFO] Exécutez cette commande pour vous authentifier:\033[0m"
    echo -e "   cloudflared tunnel login"
    echo ""
    exit 1
fi

echo -e "\033[32m[OK] Authentifié\033[0m"
echo ""

# Configuration des tunnels
declare -a tunnels=(
    "broreps-api:3005:Server (API)"
    "broreps-supply:5173:Supply (Admin)"
    "broreps-suivis:5174:Suivis (Client)"
)

echo -e "\033[36m[SETUP] Création des tunnels nommés...\033[0m"
echo ""

# Lister les tunnels existants
existing_tunnels=$(cloudflared tunnel list 2>&1)

for tunnel in "${tunnels[@]}"; do
    name="${tunnel%%:*}"
    rest="${tunnel#*:}"
    port="${rest%%:*}"
    description="${rest#*:}"
    
    # Vérifier si le tunnel existe déjà
    if echo "$existing_tunnels" | grep -q "$name"; then
        echo -e "  \033[33m[SKIP] $description ($name): existe déjà\033[0m"
    else
        echo -e "  \033[90m[*] Création de $description ($name)...\033[0m"
        
        # Créer le tunnel
        if cloudflared tunnel create "$name" 2>&1; then
            echo -e "  \033[32m[OK] $description ($name): créé\033[0m"
        else
            echo -e "  \033[31m[ERREUR] Échec de la création de $name\033[0m"
        fi
    fi
done

echo ""
echo -e "\033[36m[CONFIG] Création du fichier de configuration...\033[0m"

# Créer le dossier de configuration s'il n'existe pas
mkdir -p ~/.cloudflared

# Créer le fichier config.yml
cat > ~/.cloudflared/config.yml << 'EOF'
# Configuration des tunnels Cloudflare pour BroReps

# Tunnel Server (API) - Port 3005
tunnel: broreps-api
credentials-file: /home/USER/.cloudflared/broreps-api.json

ingress:
  - hostname: broreps-api.VOTRE-DOMAINE.com
    service: http://localhost:3005
  - service: http_status:404

---

# Tunnel Supply (Admin) - Port 5173
tunnel: broreps-supply
credentials-file: /home/USER/.cloudflared/broreps-supply.json

ingress:
  - hostname: broreps-supply.VOTRE-DOMAINE.com
    service: http://localhost:5173
  - service: http_status:404

---

# Tunnel Suivis (Client) - Port 5174
tunnel: broreps-suivis
credentials-file: /home/USER/.cloudflared/broreps-suivis.json

ingress:
  - hostname: broreps-suivis.VOTRE-DOMAINE.com
    service: http://localhost:5174
  - service: http_status:404
EOF

echo -e "\033[32m[OK] Fichier de configuration créé: ~/.cloudflared/config.yml\033[0m"
echo ""

echo -e "\033[36m[INFO] Tunnels créés:\033[0m"
cloudflared tunnel list

echo ""
echo -e "\033[33m[IMPORTANT] Configuration DNS requise\033[0m"
echo "======================================"
echo ""
echo "Pour chaque tunnel, configurez un enregistrement DNS CNAME:"
echo ""

for tunnel in "${tunnels[@]}"; do
    name="${tunnel%%:*}"
    rest="${tunnel#*:}"
    description="${rest#*:}"
    
    # Obtenir l'ID du tunnel
    tunnel_id=$(cloudflared tunnel list | grep "$name" | awk '{print $1}')
    
    if [ -n "$tunnel_id" ]; then
        echo -e "  \033[37m$description ($name):\033[0m"
        echo "    Type: CNAME"
        echo "    Name: broreps-$name.VOTRE-DOMAINE.com"
        echo "    Value: $tunnel_id.cfargotunnel.com"
        echo ""
    fi
done

echo -e "\033[36m[NEXT] Prochaines étapes:\033[0m"
echo "  1. Ajoutez les enregistrements DNS dans votre panel Cloudflare"
echo "  2. Modifiez ~/.cloudflared/config.yml avec vos domaines"
echo "  3. Lancez les tunnels avec: ./start-named-tunnels.sh"
echo ""

echo -e "\033[32m[OK] Configuration terminée!\033[0m"
echo ""
