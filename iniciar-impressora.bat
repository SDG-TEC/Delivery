@echo off
title SDG Delivery - Servidor de Impressao Elgin i8
cd /d "%~dp0"
cls
echo ====================================================================
echo   SDG DELIVERY - SERVIDOR DE IMPRESSAO TERMICA ELGIN i8
echo ====================================================================
echo   IP da Impressora: 192.168.1.150
echo   Porta RAW ESC/POS: 9100
echo   Porta do Servidor Local: 3001
echo   Ponte em Nuvem (Vercel): ATIVA (Supabase Realtime)
echo ====================================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

set "NODE_BIN=node.exe"
if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_BIN=C:\Program Files\nodejs\node.exe"
)

echo Testando comunicacao com a impressora em 192.168.1.150...
ping -n 1 -w 1000 192.168.1.150 >nul 2>&1
if errorlevel 1 (
  echo [AVISO] A impressora nao respondeu ao ping no IP 192.168.1.150.
  echo Verifique se a impressora esta ligada e com o cabo de rede conectado.
) else (
  echo [OK] Impressora Elgin i8 respondendo na rede!
)
echo.

echo Iniciando servidor de impressao com %NODE_BIN%...
"%NODE_BIN%" printer-server.js
pause
