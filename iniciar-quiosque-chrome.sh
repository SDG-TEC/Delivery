#!/usr/bin/env bash
# ==============================================================================
# 🖨️ Inicia o Google Chrome no Modo Quiosque de Impressão (--kiosk-printing)
# Nesse modo, qualquer impressão disparada pelo sistema imprime DIRETO na impressora
# padrão sem abrir nenhum diálogo ou tela de confirmação (padrão de PDV/iFood).
# ==============================================================================

TARGET_URL="${1:-https://delivery.sdgtec.com.br}"

CHROME_BIN=""
for bin in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$bin" >/dev/null 2>&1; then
    CHROME_BIN="$bin"
    break
  fi
done

if [ -z "$CHROME_BIN" ]; then
  echo "Google Chrome ou Chromium não encontrado no sistema."
  exit 1
fi

echo "===================================================================="
echo "  🚀 INICIANDO CHROME NO MODO QUIOSQUE DE IMPRESSÃO"
echo "  Destino: $TARGET_URL"
echo "  Flag: --kiosk-printing (Impressão direta sem janelas de diálogo)"
echo "===================================================================="

"$CHROME_BIN" --kiosk-printing "$TARGET_URL" &
