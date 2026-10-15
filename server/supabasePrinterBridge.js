// ==============================================================================
// ☁️ Ponte de Impressão em Nuvem via Supabase Realtime (Vercel -> PC Local -> Elgin i8)
// Permite que o sistema na Vercel (HTTPS) envie impressões para a impressora na rede local (192.168.1.150:9100)
// ==============================================================================

import { getSupabaseClient } from '../src/services/supabase.js';
import {
  checkPrinterOnline,
  sendRawToPrinter,
  getInstalledPrinters,
  sendToDefaultOsPrinter,
  isOfficePrinter
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
    const isOffice = payload?.isOffice !== undefined ? payload.isOffice : isOfficePrinter(printerName);
    const tickets = Array.isArray(payload?.tickets) && payload.tickets.length > 0
      ? payload.tickets
      : (rawEscpos ? [rawEscpos] : []);

    console.log(`🖨️ [NUVEM] Pedido de impressão recebido da Vercel (${tickets.length} cupom) para ${printerName || `${ip}:${port}`}`);

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
      const combinedPayload = tickets
        .map(t => (typeof t === 'object' && t.rawEscpos ? t.rawEscpos : t))
        .join('');

      const res = isOffice
        ? await sendToDefaultOsPrinter(combinedPayload, printerName, { isOffice: true })
        : await sendRawToPrinter(combinedPayload, ip, port, printerName);

      const totalBytes = res.bytesWritten || 0;

      console.log(`✅ [NUVEM] Impressão concluída com sucesso na ${printerName || 'impressora padrão'} (${totalBytes} bytes)!`);

      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: true,
          ticketsCount: tickets.length,
          bytesWritten: totalBytes,
          printer: res.printer || printerName || 'Padrão',
          message: tickets.length > 1
            ? `2 Vias impressas na impressora "${res.printer || printerName || 'Padrão'}"!`
            : `Cupom impresso na impressora "${res.printer || printerName || 'Padrão'}"!`,
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
          printer: printerName,
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
    const isOffice = payload?.isOffice !== undefined ? payload.isOffice : isOfficePrinter(printerName);

    console.log(`🧪 [NUVEM] Teste de impressão recebido da Vercel para ${printerName || `${ip}:${port}`}`);

    let testContent = payload?.rawEscpos;
    if (!testContent) {
      if (isOffice) {
        testContent = [
          '====================================================',
          '                 SDG RESTAURANTE',
          '====================================================',
          'TESTE DE IMPRESSAO VIA NUVEM (VERCEL -> CUPS LINUX)',
          `IMPRESSORA: ${printerName || 'EPSON EcoTank L3250'}`,
          `DATA/HORA:  ${new Date().toLocaleString('pt-BR')}`,
          'STATUS:     COMUNICACAO VIA NUVEM COM SUCESSO!',
          'SISTEMA:    SDG Delivery & Gestao de Cozinha (KDS)',
          '====================================================',
          '\n\n'
        ].join('\n');
      } else {
        testContent = '\x1B@\x1Ba\x01SDG RESTAURANTE\nTESTE DE IMPRESSAO VIA VERCEL\nCONEXAO COM SUCESSO!\n\n\n\n\x1DV\x00';
      }
    }

    try {
      const res = isOffice
        ? await sendToDefaultOsPrinter(testContent, printerName, { isOffice: true })
        : await sendRawToPrinter(testContent, ip, port, printerName);

      console.log(`✅ [NUVEM] Teste impresso com sucesso!`);
      await channel.send({
        type: 'broadcast',
        event: 'printer_test_response',
        payload: {
          jobId,
          success: true,
          bytesWritten: res.bytesWritten,
          printer: res.printer || printerName || 'Padrão',
          message: res.message || `Teste impresso com sucesso na impressora "${res.printer || printerName || 'Padrão'}"!`,
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
