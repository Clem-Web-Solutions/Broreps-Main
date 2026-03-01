#!/bin/bash

# Script pour arrêter tous les tunnels Cloudflare
# Usage: ./stop-tunnels.sh

echo -e "\033[36m[*] Arrêt des tunnels Cloudflare\033[0m"
echo "================================="
echo ""

stopped_count=0

# Arrêter les tunnels nommés (si des PIDs existent)
if [ -d "tunnel-pids" ]; then
    echo -e "\033[33m[STOP] Arrêt des tunnels nommés...\033[0m"
    
    for pid_file in tunnel-pids/*.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            tunnel_name=$(basename "$pid_file" .pid)
            
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "  \033[90m[*] Arrêt du tunnel: $tunnel_name (PID: $pid)\033[0m"
                kill "$pid" 2>/dev/null
                stopped_count=$((stopped_count + 1))
            else
                echo -e "  \033[33m[SKIP] Tunnel déjà arrêté: $tunnel_name\033[0m"
            fi
            
            # Supprimer le fichier PID
            rm "$pid_file"
        fi
    done
    
    # Supprimer le dossier s'il est vide
    rmdir tunnel-pids 2>/dev/null
fi

# Arrêter tous les processus cloudflared restants
echo ""
echo -e "\033[33m[CLEANUP] Nettoyage des processus cloudflared...\033[0m"

# Trouver tous les processus cloudflared
cloudflared_pids=$(pgrep -f "cloudflared tunnel")

if [ -n "$cloudflared_pids" ]; then
    for pid in $cloudflared_pids; do
        echo -e "  \033[90m[*] Arrêt du processus cloudflared (PID: $pid)\033[0m"
        kill "$pid" 2>/dev/null
        stopped_count=$((stopped_count + 1))
    done
else
    echo -e "  \033[32m[OK] Aucun processus cloudflared actif\033[0m"
fi

# Attendre que les processus se terminent
sleep 2

# Vérifier s'il reste des processus
remaining=$(pgrep -f "cloudflared tunnel" | wc -l)

if [ "$remaining" -gt 0 ]; then
    echo ""
    echo -e "\033[33m[WARN] Certains processus résistent, arrêt forcé...\033[0m"
    pkill -9 -f "cloudflared tunnel"
fi

echo ""
if [ $stopped_count -gt 0 ]; then
    echo -e "\033[32m[OK] $stopped_count tunnel(s) arrêté(s)\033[0m"
else
    echo -e "\033[32m[OK] Aucun tunnel actif à arrêter\033[0m"
fi

echo ""
echo -e "\033[36m[INFO] Commandes utiles:\033[0m"
echo -e "  - Vérifier les processus:    ps aux | grep cloudflared"
echo -e "  - Voir les logs:             ls -la tunnel-logs/"
echo ""
