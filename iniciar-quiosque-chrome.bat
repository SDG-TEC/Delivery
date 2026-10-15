@echo off
REM ==============================================================================
REM  SDG Delivery - Chrome em Modo Quiosque (sem servidor, so Windows + Chrome)
REM
REM  Uso:
REM    iniciar-quiosque-chrome.bat              -> Quiosque; ao imprimir o Chrome
REM                                                mostra TODAS as impressoras do
REM                                                Windows e da rede para escolher.
REM    iniciar-quiosque-chrome.bat silencioso   -> Quiosque + impressao direta sem
REM                                                janela (--kiosk-printing), na
REM                                                ultima impressora usada ou na
REM                                                padrao do Windows.
REM
REM  Dica: abra primeiro no modo normal, imprima 1 vez escolhendo a impressora
REM  certa; depois use o modo silencioso (mesmo perfil = Chrome lembra a escolha).
REM ==============================================================================
title SDG Delivery - Quiosque Chrome

set "TARGET_URL=https://delivery.sdgtec.com.br"
set "KIOSK_PROFILE=%LocalAppData%\SDG Delivery\ChromeKiosk"

set "CHROME_BIN="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME_BIN (
  echo [ERRO] Google Chrome nao encontrado. Instale o Chrome e tente novamente.
  pause
  exit /b 1
)

set "EXTRA_FLAGS="
if /i "%~1"=="silencioso" set "EXTRA_FLAGS=--kiosk-printing"

start "" "%CHROME_BIN%" --kiosk %EXTRA_FLAGS% --user-data-dir="%KIOSK_PROFILE%" --no-first-run --no-default-browser-check "%TARGET_URL%"
exit /b 0
