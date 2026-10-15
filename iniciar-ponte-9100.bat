@echo off
title SDG Delivery - Ponte TCP 9100 para Impressora USB Windows
cd /d "%~dp0"
cls

echo ====================================================================
echo   SDG DELIVERY - PONTE RAW TCP 9100 PARA IMPRESSORA USB WINDOWS
echo ====================================================================
echo   Este script abre a porta 9100 no Windows para permitir que o Mac
echo   e os tablets enviem pedidos diretamente para a sua impressora USB.
echo ====================================================================
echo.

set "PRINTER_NAME=Elgin"

:: Se quiser informar outro nome de compartilhamento, pode digitar abaixo ou passar como parametro
if not "%~1"=="" (
  set "PRINTER_NAME=%~1"
)

set "PATH=C:\Program Files\nodejs;%PATH%"

set "NODE_BIN=node.exe"
if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_BIN=C:\Program Files\nodejs\node.exe"
)

echo Usando Node: %NODE_BIN%
echo Nome da impressora compartilhada: %PRINTER_NAME%
echo.
echo Iniciando servidor TCP na porta 9100...
"%NODE_BIN%" windows-raw-bridge.js "%PRINTER_NAME%"

pause
