// ==============================================================================
// 🖨️ SDG Delivery - Ponte de Impressão para Impressora Padrão do Sistema Operacional
// Suporta Windows (Spooler Win32 RAW), macOS (CUPS lpr) e Linux sem necessidade de IP ou portas
// Permite seleção de impressora específica do SO ou uso da impressora padrão
// ==============================================================================

import net from 'net';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PRINTER_IP = process.env.PRINTER_IP || '192.168.1.100';
const DEFAULT_PRINTER_PORT = process.env.PRINTER_PORT || 9100;

/**
 * Obtém o nome da impressora padrão do sistema operacional de forma síncrona
 */
export function getDefaultPrinterNameSync() {
  if (process.platform === 'win32') {
    return '';
  }
  try {
    const out = execSync('lpstat -d 2>/dev/null', { encoding: 'utf-8', timeout: 2000 });
    const match = out.match(/:\s*(.+)$/m);
    return match && match[1] ? match[1].trim() : '';
  } catch {
    return '';
  }
}

/**
 * Faz varredura na rede local em busca de impressoras térmicas na porta 9100 (ESC/POS RAW)
 */
export function scanNetworkForPrinters(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const ifaces = os.networkInterfaces();
    const subnets = new Set();

    for (const name of Object.keys(ifaces)) {
      for (const netInfo of ifaces[name]) {
        if (netInfo.family === 'IPv4' && !netInfo.internal) {
          const parts = netInfo.address.split('.');
          if (parts.length === 4) {
            parts.pop();
            subnets.add(parts.join('.') + '.');
          }
        }
      }
    }

    if (subnets.size === 0) {
      const parts = DEFAULT_PRINTER_IP.split('.');
      parts.pop();
      subnets.add(parts.join('.') + '.');
    }

    const found = [];
    const promises = [];

    // Testa DEFAULT_PRINTER_IP primeiro
    promises.push(new Promise((res) => {
      const s = new net.Socket();
      s.setTimeout(timeoutMs);
      s.on('connect', () => {
        found.push({ ip: DEFAULT_PRINTER_IP, port: Number(DEFAULT_PRINTER_PORT) });
        s.destroy();
        res();
      });
      s.on('error', () => { s.destroy(); res(); });
      s.on('timeout', () => { s.destroy(); res(); });
      s.connect(Number(DEFAULT_PRINTER_PORT), DEFAULT_PRINTER_IP);
    }));

    // Varre todas as sub-redes locais
    for (const subnet of subnets) {
      for (let i = 1; i <= 254; i++) {
        const ip = subnet + i;
        if (ip === DEFAULT_PRINTER_IP) continue;
        promises.push(new Promise((res) => {
          const s = new net.Socket();
          s.setTimeout(timeoutMs);
          s.on('connect', () => {
            found.push({ ip, port: 9100 });
            s.destroy();
            res();
          });
          s.on('error', () => { s.destroy(); res(); });
          s.on('timeout', () => { s.destroy(); res(); });
          s.connect(9100, ip);
        }));
      }
    }

    Promise.all(promises).then(() => {
      const unique = [];
      const seen = new Set();
      for (const item of found) {
        if (!seen.has(item.ip)) {
          seen.add(item.ip);
          unique.push(item);
        }
      }
      resolve(unique);
    });
  });
}

/**
 * Lista as impressoras instaladas no sistema operacional (Windows ou macOS / Linux) e rede local
 */
export async function getInstalledPrinters() {
  const osResult = await new Promise((resolve) => {
    if (process.platform === 'win32') {
      const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json"`;
      exec(cmd, { timeout: 6000 }, (err, stdout) => {
        if (err || !stdout || !stdout.trim()) {
          return resolve({ success: true, printers: [], defaultPrinter: '' });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const printers = list.map(p => p.Name).filter(Boolean);
          const def = list.find(p => p.Default);
          resolve({
            success: true,
            printers,
            defaultPrinter: def ? def.Name : (printers[0] || '')
          });
        } catch {
          resolve({ success: true, printers: [], defaultPrinter: '' });
        }
      });
    } else {
      // macOS / Linux via CUPS
      exec('lpstat -e', { timeout: 4000 }, (err, stdout) => {
        let printers = [];
        if (!err && stdout) {
          printers = stdout.split('\n').map(s => s.trim()).filter(Boolean);
        }

        exec('lpstat -d', { timeout: 3000 }, (dErr, dStdout) => {
          let defaultPrinter = '';
          if (!dErr && dStdout) {
            const match = dStdout.match(/:\s*(.+)$/m);
            if (match && match[1]) {
              defaultPrinter = match[1].trim();
            }
          }
          if (!defaultPrinter && printers.length > 0) {
            defaultPrinter = printers[0];
          }
          resolve({ success: true, printers, defaultPrinter });
        });
      });
    }
  });

  // Complementa com varredura na rede para impressoras RAW 9100 (ex: Epson, Elgin)
  try {
    const netPrinters = await scanNetworkForPrinters(1200);
    const netLabels = netPrinters.map(p => `Rede: ${p.ip}:${p.port}`);
    const allPrinters = [...(osResult.printers || []), ...netLabels];
    let def = osResult.defaultPrinter;
    if (!def && allPrinters.length > 0) {
      def = allPrinters[0];
    }
    return {
      success: true,
      printers: allPrinters,
      defaultPrinter: def,
      networkPrinters: netPrinters
    };
  } catch {
    return osResult;
  }
}

/**
 * Informa o status da impressora (sempre pronta, sem bloqueios de tela ou pings invasivos)
 */
export function checkPrinterOnline(printerName = '') {
  return Promise.resolve({
    online: true,
    via: 'os_default_printer',
    printerName: printerName || 'Padrão do Sistema',
    message: printerName
      ? `Impressora "${printerName}" Pronta`
      : 'Impressora Padrão do Sistema Pronta'
  });
}

/**
 * Detecta se a impressora é de escritório (Epson EcoTank, HP, Canon, Brother, etc.)
 */
export function isOfficePrinter(name = '') {
  let n = (name || '').toLowerCase();
  if (!n) {
    const def = getDefaultPrinterNameSync().toLowerCase();
    n = def;
  }
  return n.includes('l3250') || n.includes('l3150') || n.includes('l4260') || n.includes('l6270') ||
         n.includes('ecotank') || n.includes('epson_l') || n.includes('epson l') ||
         n.includes('deskjet') || n.includes('laserjet') || n.includes('smart tank') ||
         n.includes('canon') || n.includes('brother') || n.includes('hp') || n.includes('pdf');
}

/**
 * Remove códigos binários ESC/POS para gerar texto limpo legível para impressoras convencionais
 */
export function stripEscposCodes(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/\x1B[@!a-z0-9\-\(\)]/gi, '')
    .replace(/\x1D[a-z0-9\-\(\)]/gi, '')
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

/**
 * Envia o cupom diretamente para a impressora padrão ou selecionada no sistema operacional
 */
export function sendToDefaultOsPrinter(rawEscpos, printerName = '', options = {}) {
  return new Promise((resolve, reject) => {
    if (!rawEscpos) {
      return reject(new Error('Nenhum comando fornecido para impressão.'));
    }

    const defaultOsPrinter = getDefaultPrinterNameSync();
    const resolvedPrinter = printerName && printerName.trim() ? printerName.trim() : defaultOsPrinter;
    const isOffice = options.isOffice !== undefined ? options.isOffice : isOfficePrinter(resolvedPrinter);
    const ext = isOffice ? 'txt' : 'bin';
    const tempFile = path.join(os.tmpdir(), `sdg_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`);

    let buffer;
    if (isOffice) {
      const clean = stripEscposCodes(Buffer.isBuffer(rawEscpos) ? rawEscpos.toString('latin1') : rawEscpos);
      buffer = Buffer.from(clean + '\n\n', 'utf-8');
    } else {
      buffer = Buffer.isBuffer(rawEscpos)
        ? rawEscpos
        : Buffer.from(rawEscpos, 'latin1');
    }

    fs.writeFileSync(tempFile, buffer);

    if (process.platform === 'win32') {
      if (isOffice) {
        const printerParam = printerName && printerName.trim() ? ` -PrinterName "${printerName.trim()}"` : '';
        const cmd = `powershell.exe -NoProfile -Command "Get-Content -Path '${tempFile}' | Out-Printer${printerParam}"`;
        exec(cmd, { timeout: 10000 }, (err) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          if (err) return reject(new Error(`Erro ao imprimir no Windows: ${err.message}`));
          resolve({
            success: true,
            bytesWritten: buffer.length,
            via: 'os_default_printer_win_office',
            printer: printerName || 'Padrão',
            message: `Documento impresso com sucesso na impressora "${printerName || 'Padrão'}"!`
          });
        });
      } else {
        // No Windows térmico: invoca o script PowerShell conectado à Win32 Spooler API (winspool.drv)
        const ps1Path = path.join(__dirname, 'print-raw-windows.ps1');
        const printerParam = printerName && printerName.trim()
          ? ` -printerName "${printerName.trim().replace(/"/g, '`"')}"`
          : '';
        const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}" -filePath "${tempFile}"${printerParam}`;

        exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}

          if (err) {
            console.error('[Printer] Erro no Spooler do Windows:', stderr || err.message);
            return reject(new Error(`Erro ao enviar para impressora do Windows: ${stderr || err.message}`));
          }

          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed && parsed.success === false) {
              return reject(new Error(parsed.error || 'Falha ao imprimir no Windows.'));
            }
            resolve({
              success: true,
              bytesWritten: buffer.length,
              via: 'os_default_printer_win',
              printer: parsed?.printer || printerName || 'Padrão',
              message: parsed?.message || `Cupom impresso com sucesso na impressora "${parsed?.printer || printerName || 'Padrão'}"!`
            });
          } catch {
            resolve({
              success: true,
              bytesWritten: buffer.length,
              via: 'os_default_printer_win',
              printer: printerName || 'Padrão',
              message: `Cupom impresso com sucesso na impressora "${printerName || 'Padrão'}"!`
            });
          }
        });
      }
    } else {
      // No macOS / Linux: para impressoras térmicas usa -l (raw). Para impressoras de escritório A4, não usa -l para permitir filtros PPD
      const printerParam = resolvedPrinter
        ? `-P "${resolvedPrinter}" `
        : '';
      const rawFlag = isOffice ? '' : '-l ';
      const cmd = `lpr ${printerParam}${rawFlag}"${tempFile}"`;

      exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}

        if (err) {
          console.error('[Printer] Erro no comando lpr do Mac/Linux:', stderr || err.message);
          return reject(new Error(`Erro ao enviar para impressora "${resolvedPrinter || 'padrão'}": ${stderr || err.message}`));
        }

        resolve({
          success: true,
          bytesWritten: buffer.length,
          via: isOffice ? 'os_cups_office' : 'os_default_printer_unix',
          printer: resolvedPrinter || 'Padrão',
          message: `Cupom impresso com sucesso na impressora "${resolvedPrinter || 'Padrão'}"!`
        });
      });
    }
  });
}

/**
 * Fallback TCP direto via socket caso configurado especificamente
 */
function sendToTcpSocket(rawEscpos, ip, port = 9100, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    socket.setTimeout(timeout);

    const buffer = Buffer.isBuffer(rawEscpos)
      ? rawEscpos
      : Buffer.from(rawEscpos, 'latin1');

    socket.connect(Number(port), ip, () => {
      socket.write(buffer, () => {
        setTimeout(() => {
          if (!settled) {
            settled = true;
            socket.destroy();
            resolve({
              success: true,
              bytesWritten: buffer.length,
              via: 'tcp_socket',
              ip,
              port: Number(port),
              message: `Impresso via socket TCP (${ip}:${port})`
            });
          }
        }, 200);
      });
    });

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error(`Falha socket TCP (${ip}:${port}): ${err.message}`));
      }
    });

    socket.on('timeout', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error(`Timeout socket TCP (${ip}:${port})`));
      }
    });
  });
}

/**
 * Envia comandos ESC/POS brutos (prioriza a impressora selecionada ou padrão do sistema operacional)
 */
export async function sendRawToPrinter(rawEscpos, ip = null, port = DEFAULT_PRINTER_PORT, printerName = '') {
  // Se printerName tiver um IP especificado (ex: "Rede: 192.168.1.100:9100"), usa diretamente TCP
  const ipMatch = (printerName || '').match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipMatch) {
    const targetIp = ipMatch[1];
    const portMatch = (printerName || '').match(/:(\d+)/);
    const targetPort = portMatch ? Number(portMatch[1]) : (port || DEFAULT_PRINTER_PORT);
    return await sendToTcpSocket(rawEscpos, targetIp, targetPort, 3000);
  }

  // 1. Prioridade: Envia direto para a impressora do SO se disponível
  try {
    return await sendToDefaultOsPrinter(rawEscpos, printerName);
  } catch (osErr) {
    console.warn('[Printer] Tentativa via impressora do SO não respondeu:', osErr.message);

    // 2. Se falhar (ex: Linux sem CUPS ativo), tenta socket TCP
    const targetIp = ip || process.env.PRINTER_IP || DEFAULT_PRINTER_IP;
    if (targetIp && targetIp !== '127.0.0.1' && targetIp !== 'localhost') {
      try {
        return await sendToTcpSocket(rawEscpos, targetIp, port, 3000);
      } catch (tcpErr) {
        console.warn('[Printer] Fallback TCP direto também falhou:', tcpErr.message);
      }
    }

    throw osErr;
  }
}

/**
 * Lê o corpo da requisição HTTP como JSON
 */
export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('JSON inválido no corpo da requisição: ' + e.message));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Middleware para tratar requisições /api/printer no Vite ou Servidor HTTP
 */
export async function handlePrinterRoute(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = parsedUrl.pathname.replace(/^\/api\/printer/, '');
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  try {
    // 0. Varredura de impressoras na rede local (porta 9100)
    if (pathname === '/discover' || pathname === '/scan') {
      const discovered = await scanNetworkForPrinters(1200);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        count: discovered.length,
        printers: discovered.map(p => ({
          ip: p.ip,
          port: p.port,
          name: `Rede: ${p.ip}:${p.port}`
        }))
      }));
      return true;
    }

    // 1. Listar impressoras instaladas no sistema operacional
    if (pathname === '/list' || pathname === '/printers' && req.method === 'GET') {
      const result = await getInstalledPrinters();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    // 2. Status da impressora (sempre online e pronta)
    if (pathname === '/status' || pathname === '/') {
      const printerName = parsedUrl.searchParams.get('printerName') || '';
      const result = await checkPrinterOnline(printerName);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    // 3. Imprimir ticket (individual ou múltiplos com corte)
    if (pathname === '/print' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const rawEscpos = body.rawEscpos;
      const printerName = body.printerName || '';
      const tickets = Array.isArray(body.tickets) && body.tickets.length > 0
        ? body.tickets
        : (rawEscpos ? [rawEscpos] : []);

      if (tickets.length === 0) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'rawEscpos ou tickets é obrigatório.' }));
        return true;
      }

      // Combina todas as vias (Balcão e Motoboy/Cozinha) em um único fluxo contínuo
      const combinedPayload = tickets
        .map(t => (typeof t === 'object' && t.rawEscpos ? t.rawEscpos : t))
        .join('');

      const isOffice = isOfficePrinter(printerName);
      const printRes = isOffice
        ? await sendToDefaultOsPrinter(combinedPayload, printerName, { isOffice: true })
        : await sendRawToPrinter(combinedPayload, body.printerIp, body.printerPort, printerName);

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        ticketsCount: tickets.length,
        bytesWritten: printRes.bytesWritten || 0,
        via: printRes.via || 'os_default_printer',
        printer: printRes.printer || printerName || 'Padrão',
        message: tickets.length > 1
          ? `2 Vias impressas na impressora "${printRes.printer || printerName || 'Padrão'}"!`
          : `Cupom impresso na impressora "${printRes.printer || printerName || 'Padrão'}"!`
      }));
      return true;
    }

    // 4. Teste de impressão
    if (pathname === '/test' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const printerName = body.printerName || '';
      const isOffice = body.isOffice !== undefined ? body.isOffice : isOfficePrinter(printerName);
      let payload = body.rawEscpos;
      if (isOffice) {
        if (!payload || payload.includes('\x1B') || payload.includes('\x1D')) {
          const resolvedName = printerName || getDefaultPrinterNameSync() || 'PADRAO DO SISTEMA';
          payload = [
            '====================================================',
            '                 SDG RESTAURANTE',
            '====================================================',
            'TESTE DE IMPRESSAO DIRETA (CUPS LINUX)',
            `IMPRESSORA: ${resolvedName}`,
            `DATA/HORA:  ${new Date().toLocaleString('pt-BR')}`,
            'STATUS:     COMUNICACAO 100% OPERACIONAL',
            'SISTEMA:    SDG Delivery & Gestao de Cozinha (KDS)',
            '====================================================',
            'Este teste confirma que sua impressora esta conectada',
            'e configurada com sucesso no sistema!',
            '====================================================',
            '\n\n'
          ].join('\n');
        } else {
          payload = stripEscposCodes(payload);
        }
      } else if (!payload) {
        payload = '\x1B@\x1Ba\x01\x1B!\x11SDG RESTAURANTE\x1B!\x00\nTESTE DE IMPRESSAO\nIMPRESSORA: ' + (printerName || 'PADRAO DO SISTEMA') + '\nCONEXAO COM SUCESSO!\n\n\n\n\x1DV\x00';
      }

      const printRes = isOffice
        ? await sendToDefaultOsPrinter(payload, printerName, { isOffice: true })
        : await sendRawToPrinter(payload, body.printerIp, body.printerPort, printerName);

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(printRes));
      return true;
    }

    return false;
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: err.message,
      fallbackToBrowser: true
    }));
    return true;
  }
}
