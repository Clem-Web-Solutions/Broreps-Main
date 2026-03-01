#!/bin/bash

# Script pour démarrer les tunnels Cloudflare (URLs temporaires)
# Usage: ./start-tunnels.sh

echo -e "\033[36m[*] Démarrage des tunnels Cloudflare\033[0m"
echo "===================================="
echo ""

# Vérifier que cloudflared est installé
if ! command -v cloudflared &> /dev/null; then
    echo -e "\033[31m[ERREUR] Cloudflare Tunnel n'est pas installé\033[0m"
    echo -e "   Installez-le avec:"
    echo -e "   - macOS: brew install cloudflare/cloudflare/cloudflared"
    echo -e "   - Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
fi

cloudflared_version=$(cloudflared --version 2>&1)
echo -e "\033[32m[OK] Cloudflare Tunnel installé: $cloudflared_version\033[0m"
echo ""

# Configuration des tunnels
declare -a tunnels=(
    "3005:Server (API):green"
    "5173:Supply (Admin):blue"
    "5174:Suivis (Client):magenta"
)

echo -e "\033[33m[CONFIG] Configuration des tunnels:\033[0m"
for tunnel in "${tunnels[@]}"; do
    port="${tunnel%%:*}"
    name="${tunnel#*:}"
    name="${name%%:*}"
    echo -e "  - $name: http://localhost:$port"
done
echo ""

# Créer le dossier pour les logs
mkdir -p tunnel-logs
mkdir -p tunnel-pids

echo -e "\033[36m[START] Démarrage des tunnels...\033[0m"
echo ""

# Démarrer chaque tunnel
for tunnel in "${tunnels[@]}"; do
    port="${tunnel%%:*}"
    rest="${tunnel#*:}"
    name="${rest%%:*}"
    color="${rest##*:}"
    
    echo -e "  \033[90m[*] Démarrage du tunnel pour $name (port $port)...\033[0m"
    
    # Démarrer cloudflared en arrière-plan
    cloudflared tunnel --url http://localhost:$port > "tunnel-logs/tunnel-$port.log" 2>&1 &
    pid=$!
    echo $pid > "tunnel-pids/tunnel-$port.pid"
    
    sleep 0.5
done

echo ""
echo -e "\033[33m[WAIT] Attente de l'initialisation des tunnels (10 secondes)...\033[0m"
sleep 10

echo ""
echo -e "\033[32m[OK] Tunnels démarrés!\033[0m"
echo ""
echo -e "\033[36m[INFO] URLs des tunnels:\033[0m"
echo "==================="
echo ""

# Extraire les URLs des logs
for tunnel in "${tunnels[@]}"; do
    port="${tunnel%%:*}"
    rest="${tunnel#*:}"
    name="${rest%%:*}"
    
    log_file="tunnel-logs/tunnel-$port.log"
    
    if [ -f "$log_file" ]; then
        # Chercher l'URL dans le log
        url=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$log_file" | tail -1)
        
        if [ -n "$url" ]; then
            echo -e "  \033[37m[URL] $name (Port $port): $url\033[0m"
        else
            echo -e "  \033[31m[?] $name (Port $port): En attente...\033[0m"
        fi
    fi
done

echo ""
echo -e "\033[36m[INFO] Sauvegarde des URLs...\033[0m"

# Sauvegarder les URLs dans un fichier
{
    for tunnel in "${tunnels[@]}"; do
        port="${tunnel%%:*}"
        rest="${tunnel#*:}"
        name="${rest%%:*}"
        
        log_file="tunnel-logs/tunnel-$port.log"
        
        if [ -f "$log_file" ]; then
            url=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$log_file" | tail -1)
            
            if [ -n "$url" ]; then
                echo "$name (Port $port): $url"
            fi
        fi
    done
} > tunnel-urls.txt

echo -e "  \033[32m[OK] URLs sauvegardées dans: tunnel-urls.txt\033[0m"
echo ""

echo -e "\033[36m[INFO] Commandes utiles:\033[0m"
echo -e "  - Voir les processus:        ps aux | grep cloudflared"
echo -e "  - Voir les logs en direct:   tail -f tunnel-logs/tunnel-*.log"
echo -e "  - Voir les URLs:             cat tunnel-urls.txt"
echo -e "  - Arrêter les tunnels:       ./stop-tunnels.sh"
echo ""

echo -e "\033[32m[WATCH] Tunnels démarrés en arrière-plan\033[0m"
echo -e "\033[33m[INFO] Pour surveiller: tail -f tunnel-logs/tunnel-*.log\033[0m"
echo ""

# Afficher le contenu du fichier tunnel-urls.txt
echo -e "\033[36m[URLs] Contenu de tunnel-urls.txt:\033[0m"
echo "=================================="
cat tunnel-urls.txt
echo ""
