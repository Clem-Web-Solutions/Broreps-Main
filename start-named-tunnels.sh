#!/bin/bash

# Script pour démarrer les tunnels Cloudflare NOMMÉS (URLs fixes)
# Prérequis: Avoir exécuté setup-tunnels-named.sh d'abord
# Usage: ./start-named-tunnels.sh

echo -e "\033[36m[*] Démarrage des tunnels Cloudflare nommés\033[0m"
echo "============================================"
echo ""

# Configuration des tunnels
declare -A tunnels
tunnels=(
    ["broreps-api"]="3005:Server (API)"
    ["broreps-supply"]="5173:Supply (Admin)"
    ["broreps-suivis"]="5174:Suivis (Client)"
)

echo -e "\033[33m[CHECK] Vérification des tunnels...\033[0m"

# Lister les tunnels existants
existing_tunnels=$(cloudflared tunnel list 2>&1)

all_exist=true
for tunnel_name in "${!tunnels[@]}"; do
    if echo "$existing_tunnels" | grep -q "$tunnel_name"; then
        echo -e "  \033[32m[OK] $tunnel_name existe\033[0m"
    else
        echo -e "  \033[31m[ERREUR] $tunnel_name n'existe pas\033[0m"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo ""
    echo -e "\033[33m[WARN] Certains tunnels n'existent pas!\033[0m"
    echo -e "   Exécutez d'abord: ./setup-tunnels-named.sh"
    exit 1
fi

echo ""
echo -e "\033[36m[START] Démarrage des tunnels...\033[0m"
echo ""

# Créer un dossier pour les PIDs
mkdir -p tunnel-pids

# Démarrer chaque tunnel en arrière-plan
for tunnel_name in "${!tunnels[@]}"; do
    tunnel_info="${tunnels[$tunnel_name]}"
    port="${tunnel_info%%:*}"
    description="${tunnel_info#*:}"
    
    echo -e "  \033[90m[*] Démarrage de $description ($tunnel_name)...\033[0m"
    
    # Démarrer le tunnel en arrière-plan et sauvegarder le PID
    cloudflared tunnel run "$tunnel_name" > "tunnel-logs/tunnel-$tunnel_name.log" 2>&1 &
    echo $! > "tunnel-pids/$tunnel_name.pid"
    
    sleep 0.5
done

echo ""
echo -e "\033[32m[OK] Tunnels démarrés!\033[0m"
echo ""

echo -e "\033[36m[INFO] Tunnels actifs:\033[0m"
echo "====================="
for tunnel_name in "${!tunnels[@]}"; do
    tunnel_info="${tunnels[$tunnel_name]}"
    port="${tunnel_info%%:*}"
    description="${tunnel_info#*:}"
    pid=$(cat "tunnel-pids/$tunnel_name.pid" 2>/dev/null)
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "  - \033[37m$description ($tunnel_name) - Port $port - PID: $pid\033[0m"
    else
        echo -e "  - \033[31m$description ($tunnel_name) - ERREUR\033[0m"
    fi
done

echo ""
echo -e "\033[36m[INFO] URLs des tunnels:\033[0m"
echo "====================="
sleep 3  # Attendre que les URLs soient disponibles dans les logs

for tunnel_name in "${!tunnels[@]}"; do
    tunnel_info="${tunnels[$tunnel_name]}"
    description="${tunnel_info#*:}"
    log_file="tunnel-logs/tunnel-$tunnel_name.log"
    
    if [ -f "$log_file" ]; then
        # Extraire l'URL du log (chercher dans les dernières lignes)
        url=$(grep -o 'https://[^ ]*' "$log_file" | tail -1)
        if [ -n "$url" ]; then
            echo -e "  \033[37m[URL] $description: $url\033[0m"
        fi
    fi
done

echo ""
echo -e "\033[36m[INFO] Commandes utiles:\033[0m"
echo -e "  - Voir les processus:        ps aux | grep cloudflared"
echo -e "  - Voir les logs:             tail -f tunnel-logs/tunnel-*.log"
echo -e "  - Arrêter les tunnels:       ./stop-tunnels.sh"
echo ""

echo -e "\033[32m[WATCH] Tunnels démarrés en arrière-plan\033[0m"
echo -e "\033[33m[INFO] Pour surveiller: tail -f tunnel-logs/tunnel-*.log\033[0m"
echo ""
