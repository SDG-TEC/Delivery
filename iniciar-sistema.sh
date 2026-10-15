#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "===================================================================="
echo "  SDG DELIVERY & KDS - INICIANDO SISTEMA LOCAL"
echo "===================================================================="
echo "  - Painel Web (Balcão, Cozinha KDS, Garçom e Admin)"
echo "  - Servidor Web (Vite): http://localhost:5173"
echo "===================================================================="
echo ""

# Garante que ~/.local/bin está no PATH
export PATH="$HOME/.local/bin:$PATH"

# Abre o navegador automaticamente
open "http://localhost:5173"

# Inicia o servidor Vite
npm run dev
