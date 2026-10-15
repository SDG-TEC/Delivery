import net from 'net';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * 🖨️ SDG Delivery - Ponte Raw TCP 9100 para Impressora USB Compartilhada no Windows
 * 
 * Este script roda no computador onde a impressora USB está conectada (192.168.1.20).
 * Ele escuta na porta 9100 e repassa todos os comandos ESC/POS diretamente para a
 * fila de impressão USB compartilhada do Windows.
 */

// Nome do compartilhamento da impressora no Windows (ex: "Elgin", "POS80", "i8")
// Pode ser passado como argumento: node windows-raw-bridge.js "NomeDaImpressora"
const PRINTER_SHARE_NAME = process.argv[2] || process.env.PRINTER_SHARE_NAME || 'Elgin';
const PORT = 9100;

const server = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[${new Date().toLocaleTimeString()}] Conexão de impressão recebida de ${clientAddr}`);

  const chunks = [];

  socket.on('data', (chunk) => {
    chunks.push(chunk);
  });

  socket.on('end', () => {
    const data = Buffer.concat(chunks);
    if (data.length === 0) {
      console.log('Teste de conexão TCP (ping 9100) concluído.');
      return;
    }

    console.log(`Recebidos ${data.length} bytes ESC/POS. Enviando para a impressora "${PRINTER_SHARE_NAME}"...`);

    const tempFile = path.join(os.tmpdir(), `sdg_ticket_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, data);

    // Envia o arquivo binário bruto diretamente para a impressora compartilhada do Windows
    const cmd = `cmd.exe /c copy /b "${tempFile}" "\\\\127.0.0.1\\${PRINTER_SHARE_NAME}"`;
    exec(cmd, (err, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}

      if (err) {
        console.error(`❌ Erro ao imprimir na impressora "${PRINTER_SHARE_NAME}":`, stderr || err.message);
        console.error(`💡 Dica: Verifique se a impressora está compartilhada no Windows com o nome "${PRINTER_SHARE_NAME}".`);
      } else {
        console.log(`✅ Cupom impresso com sucesso na impressora "${PRINTER_SHARE_NAME}"!`);
      }
    });
  });

  socket.on('error', (err) => {
    console.error('Erro no socket TCP:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`🖨️  SDG DELIVERY - SERVIDOR RAW TCP 9100 (WINDOWS USB)`);
  console.log('================================================================');
  console.log(`🌐 Escutando na porta: ${PORT} (0.0.0.0:${PORT})`);
  console.log(`🎯 Impressora de destino: \\\\127.0.0.1\\${PRINTER_SHARE_NAME}`);
  console.log(`📢 Agora o Mac e outros dispositivos podem imprimir em 192.168.1.20:9100!`);
  console.log('================================================================\n');
});
