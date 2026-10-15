@echo off
title SDG Delivery - App do Motoboy (React Native / Expo)
cls
echo ====================================================================
echo   SDG DELIVERY - APP ANDROID PARA MOTOBOYS (REACT NATIVE)
echo ====================================================================
echo   - Rastreamento GPS continuo em tempo real
echo   - Suporte nativo a transmissao com tela apagada / bloqueada no bolso
echo   - Integrado ao Supabase e ao painel web do SDG Delivery
echo ====================================================================
echo.
echo Para testar no celular:
echo 1. Instale o app "Expo Go" no Android pela Google Play Store
echo 2. Escaneie o QR Code que vai aparecer abaixo
echo ====================================================================
echo.
cd /d "%~dp0sdg-motoboy-app"
npx expo start
pause
