@echo off
cd /d "%~dp0"
title SDG Delivery

REM ==============================================================================
REM SDG Delivery - Quiosque e Servidor Nativo de Impressao Direta (Windows)
REM Zero configuracao previa: Nao necessita de Node.js, Python ou qualquer instalador!
REM ==============================================================================

if not exist "%~dp0SDG-Delivery.exe" (
    echo [SDG Delivery] Compilando executavel nativo...
    set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    "%CSC%" /nologo /target:winexe /optimize /platform:anycpu /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /win32icon:"%~dp0launcher\app.ico" /out:"%~dp0SDG-Delivery.exe" "%~dp0launcher\SDG-Delivery.cs"
)

start "" "%~dp0SDG-Delivery.exe" %*
exit /b 0
