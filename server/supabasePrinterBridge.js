import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Carrega .env / .env.local automaticamente em ambiente Node puro
function loadEnvFile() {
  if (process.env.VITE_SUPABASE_URL) return;
  const candidates = ['.env.local', '.env'];
  for (const filename of candidates) {
    const fullPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, 'utf-8');
        for (const line of text.split('\n')) {
          const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (m) {
            const k = m[1];
            const v = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[k]) process.env[k] = v;
          }
        }
      } catch (e) {}
    }
  }
}
loadEnvFile();

import { getSupabaseClient } from '../src/services/supabase.js';
import {
  checkPrinterOnline,
  sendRawToPrinter,
  getInstalledPrinters,
  sendToDefaultOsPrinter,
  isOfficePrinter,
  getDefaultPrinterNameSync,
  stripEscposCodes
} from './printerBridge.js';

export const PRINTER_CHANNEL_NAME = 'sdg-printer-bridge';

/**
 * Inicia o listener de impressão conectado ao Supabase Realtime no computador da loja
 */
export function startSupabasePrinterListener({
  defaultIp = process.env.PRINTER_IP || '192.168.1.100',
  defaultPort = 9100,
  onStatusChange = null
} = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('⚠️  Supabase não configurado. Ponte em nuvem não iniciada.');
    return null;
  }

  const channel = supabase.channel(PRINTER_CHANNEL_NAME, {
    config: { broadcast: { self: false } }
  });

  // 1. Responder a solicitação de lista de impressoras instaladas
  channel.on('broadcast', { event: 'printer_list_request' }, async ({ payload }) => {
    const reqId = payload?.reqId;
    console.log(`📋 [NUVEM] Solicitação de lista de impressoras recebida da Vercel`);
    try {
      const printersData = await getInstalledPrinters();
      await channel.send({
        type: 'broadcast',
        event: 'printer_list_response',
        payload: {
          reqId,
          success: true,
          printers: printersData.printers || [],
          defaultPrinter: printersData.defaultPrinter || '',
          networkPrinters: printersData.networkPrinters || [],
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error('[NUVEM] Erro ao listar impressoras:', err.message);
    }
  });

  // 2. Responder a PING de status emitido pela Vercel / Web
  channel.on('broadcast', { event: 'printer_ping' }, async ({ payload }) => {
    const reqId = payload?.reqId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;
    const printerName = payload?.printerName || '';

    console.log(`📡 [NUVEM] Ping recebido da Vercel para impressora ${printerName || `${ip}:${port}`}`);
    const status = await checkPrinterOnline(printerName);

    await channel.send({
      type: 'broadcast',
      event: 'printer_pong',
      payload: {
        reqId,
        online: status.online,
        ip,
        port,
        printerName,
        message: status.message || (status.online ? `Impressora ${printerName || 'Padrão'} pronta` : 'Impressora offline'),
        timestamp: Date.now()
      }
    });
  });

  // 3. Responder a requisição de impressão vinda da Vercel
  channel.on('broadcast', { event: 'printer_print_request' }, async ({ payload }) => {
    const jobId = payload?.jobId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;
    const printerName = payload?.printerName || '';
    const rawEscpos = payload?.rawEscpos;
    const resolvedPrinter = printerName || getDefaultPrinterNameSync();
    const isOffice = payload?.isOffice !== undefined ? payload.isOffice : isOfficePrinter(resolvedPrinter);
    const tickets = Array.isArray(payload?.tickets) && payload.tickets.length > 0
      ? payload.tickets
      : (rawEscpos ? [rawEscpos] : []);

    console.log(`🖨️ [NUVEM] Pedido de impressão recebido da Vercel (${tickets.length} cupom) para ${resolvedPrinter || `${ip}:${port}`}`);

    if (tickets.length === 0) {
      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: false,
          error: 'Nenhum dado fornecido para impressão.',
          timestamp: Date.now()
        }
      });
      return;
    }

    try {
      let combinedPayload = tickets
        .map(t => (typeof t === 'object' && t.rawEscpos ? t.rawEscpos : t))
        .join('');

      if (isOffice) {
        combinedPayload = stripEscposCodes(combinedPayload);
      }

      const res = isOffice
        ? await sendToDefaultOsPrinter(combinedPayload, resolvedPrinter, { isOffice: true })
        : await sendRawToPrinter(combinedPayload, ip, port, resolvedPrinter);

      const totalBytes = res.bytesWritten || 0;

      console.log(`✅ [NUVEM] Impressão concluída com sucesso na ${res.printer || resolvedPrinter || 'impressora padrão'} (${totalBytes} bytes)!`);

      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: true,
          ticketsCount: tickets.length,
          bytesWritten: totalBytes,
          printer: res.printer || resolvedPrinter || 'Padrão',
          message: tickets.length > 1
            ? `2 Vias impressas na impressora "${res.printer || resolvedPrinter || 'Padrão'}"!`
            : `Cupom impresso na impressora "${res.printer || resolvedPrinter || 'Padrão'}"!`,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error(`❌ [NUVEM] Erro ao imprimir:`, err.message);
      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: false,
          error: err.message,
          printer: resolvedPrinter,
          timestamp: Date.now()
        }
      });
    }
  });

  // 4. Responder a teste de impressão vindo da Vercel
  channel.on('broadcast', { event: 'printer_test_request' }, async ({ payload }) => {
    const jobId = payload?.jobId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;
    const printerName = payload?.printerName || '';
    const resolvedPrinter = printerName || getDefaultPrinterNameSync();
    const isOffice = payload?.isOffice !== undefined ? payload.isOffice : isOfficePrinter(resolvedPrinter);

    console.log(`🧪 [NUVEM] Teste de impressão recebido da Vercel para ${resolvedPrinter || `${ip}:${port}`}`);

    let testContent = payload?.rawEscpos;
    if (isOffice) {
      if (!testContent || testContent.includes('\x1B') || testContent.includes('\x1D')) {
        testContent = [
          '====================================================',
          '                 SDG RESTAURANTE',
          '====================================================',
          'TESTE DE IMPRESSAO VIA NUVEM (VERCEL -> CUPS LINUX)',
          `IMPRESSORA: ${resolvedPrinter || 'PADRAO DO SISTEMA'}`,
          `DATA/HORA:  ${new Date().toLocaleString('pt-BR')}`,
          'STATUS:     COMUNICACAO VIA NUVEM COM SUCESSO!',
          'SISTEMA:    SDG Delivery & Gestao de Cozinha (KDS)',
          '====================================================',
          '\n\n'
        ].join('\n');
      } else {
        testContent = stripEscposCodes(testContent);
      }
    } else if (!testContent) {
      testContent = '\x1B@\x1Ba\x01SDG RESTAURANTE\nTESTE DE IMPRESSAO VIA VERCEL\nCONEXAO COM SUCESSO!\n\n\n\n\x1DV\x00';
    }

    try {
      const res = isOffice
        ? await sendToDefaultOsPrinter(testContent, resolvedPrinter, { isOffice: true })
        : await sendRawToPrinter(testContent, ip, port, resolvedPrinter);

      console.log(`✅ [NUVEM] Teste impresso com sucesso!`);
      await channel.send({
        type: 'broadcast',
        event: 'printer_test_response',
        payload: {
          jobId,
          success: true,
          bytesWritten: res.bytesWritten,
          printer: res.printer || resolvedPrinter || 'Padrão',
          message: res.message || `Teste impresso com sucesso na impressora "${res.printer || resolvedPrinter || 'Padrão'}"!`,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error(`❌ [NUVEM] Falha no teste de impressão:`, err.message);
      await channel.send({
        type: 'broadcast',
        event: 'printer_test_response',
        payload: {
          jobId,
          success: false,
          error: err.message,
          timestamp: Date.now()
        }
      });
    }
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`================================================================`);
      console.log(`📡 PONTE EM NUVEM ATIVA: Conectada ao Supabase Realtime!`);
      console.log(`☁️  Pronto para imprimir da Vercel (HTTPS) na Elgin em ${defaultIp}:${defaultPort}`);
      console.log(`================================================================`);

      await channel.track({
        online: true,
        ip: defaultIp,
        port: defaultPort,
        updatedAt: Date.now()
      });
    }
  });

  return channel;
}

// Auto-inicia quando executado diretamente pelo terminal (ex: node server/supabasePrinterBridge.js)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('🚀 Iniciando Ponte de Impressão em Nuvem (Supabase Realtime)...');
  startSupabasePrinterListener();
}
