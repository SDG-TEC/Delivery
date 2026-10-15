#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "===================================================================="
echo "  ☁️ SDG DELIVERY - PONTE DE IMPRESSÃO EM NUVEM (SUPABASE)"
echo "  Conecta o sistema na Vercel (https://delivery.sdgtec.com.br)"
echo "  diretamente à sua impressora instalada no Linux (CUPS)"
echo "===================================================================="
echo ""

export PATH="$HOME/.local/bin:$PATH"

node server/supabasePrinterBridge.js
