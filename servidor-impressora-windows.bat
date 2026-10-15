@echo off
title Servidor de Impressao SDG Delivery (Porta 9100)
cls

echo ====================================================================
echo   SDG DELIVERY - SERVIDOR DE IMPRESSAO TERMICA (PORTA 9100)
echo ====================================================================
echo   Impressora USB de Destino: 80 (POS-80)
echo   Porta de Escuta: 9100
echo ====================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 9100; $printer = '80'; try { $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port); $listener.Start(); } catch { Write-Host '❌ Erro ao abrir a porta 9100. Verifique se ja existe outro programa usando.' -ForegroundColor Red; exit; }; Write-Host '=====================================================' -ForegroundColor Cyan; Write-Host '  SERVIDOR ATIVO NA PORTA 9100!' -ForegroundColor Green; Write-Host '  Aguardando pedidos de impressao do Mac...' -ForegroundColor Yellow; Write-Host '  Mantenha esta janela aberta enquanto estiver usando.' -ForegroundColor Gray; Write-Host '=====================================================' -ForegroundColor Cyan; while ($true) { try { $client = $listener.AcceptTcpClient(); $stream = $client.GetStream(); $temp = [System.IO.Path]::GetTempFileName(); $fs = [System.IO.File]::Create($temp); $buffer = New-Object byte[] 4096; while (($bytesRead = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) { $fs.Write($buffer, 0, $bytesRead); }; $fs.Close(); $client.Close(); if ((Get-Item $temp).Length -gt 0) { Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Novo pedido recebido! Imprimindo...'); cmd.exe /c copy /b \"$temp\" \"\\127.0.0.1\$printer\" | Out-Null; Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Cupom impresso com sucesso!' ) -ForegroundColor Green; }; Remove-Item $temp -Force -ErrorAction SilentlyContinue; } catch { Write-Host ('Erro: ' + $_) -ForegroundColor Red; } }"

pause
