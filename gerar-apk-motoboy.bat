@echo off
title SDG Delivery - Gerar APK Atualizado do Motoboy
cls
echo ====================================================================
echo   SDG DELIVERY - GERANDO NOVO APK DO MOTOBOY (EAS BUILD)
echo ====================================================================
echo   Versao: 1.0.1 (Com correcao contra fechamento automatico no Android)
echo ====================================================================
echo.
echo Iniciando compilacao do APK na nuvem do Expo...
cd /d "%~dp0sdg-motoboy-app"
call npx eas-cli build -p android --profile preview
echo.
echo ====================================================================
echo   Compilacao finalizada! Baixe o APK pelo link acima.
echo ====================================================================
pause
