@echo off
title SDG Delivery - Sistema Completo (Painel Web + Impressora Elgin i8)
cd /d "%~dp0"
cls
echo ====================================================================
echo   SDG DELIVERY & KDS - INICIANDO SISTEMA COMPLETO
echo ====================================================================
echo   - Painel Web (Balcao, Cozinha KDS, Garcom e Admin)
echo   - Servidor Local de Impressao Elgin i8 (ESC/POS Porta 9100)
echo   - IP da Impressora: 192.168.1.150
echo ====================================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

set "NODE_BIN=node.exe"
if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_BIN=C:\Program Files\nodejs\node.exe"
)

echo [1/3] Verificando conexao com a impressora Elgin i8 (192.168.1.150)...
ping -n 1 -w 1200 192.168.1.150 >nul 2>&1
if errorlevel 1 (
  echo   [AVISO] Impressora 192.168.1.150 nao respondeu ao ping no momento.
  echo   O sistema vai iniciar normalmente, mas verifique o cabo de rede/forca da Elgin.
) else (
  echo   [OK] Impressora Elgin i8 online e respondendo na rede!
)
echo.

echo [2/3] Iniciando Servidor Local de Impressao (Porta 3001)...
start "SDG - Servidor de Impressao Elgin i8" /min "%NODE_BIN%" printer-server.js
echo   [OK] Servidor de impressao rodando em segundo plano.
echo.

echo [3/3] Iniciando Servidor Web (Vite) e abrindo navegador...
start "" "http://localhost:5173"
echo.
echo ====================================================================
echo   SISTEMA ONLINE: http://localhost:5173
echo   Mantenha esta janela aberta enquanto o restaurante estiver operando.
echo ====================================================================
echo.

"%NODE_BIN%" .\node_modules\vite\bin\vite.js --host
pause
