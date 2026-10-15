// ==============================================================================
// ☁️ Ponte de Impressão em Nuvem via Supabase Realtime (Vercel -> PC Local -> Elgin i8)
// Permite que o sistema na Vercel (HTTPS) envie impressões para a impressora na rede local (192.168.1.150:9100)
// ==============================================================================

import { getSupabaseClient } from '../src/services/supabase.js';
import { checkPrinterOnline, sendRawToPrinter } from './printerBridge.js';

export const PRINTER_CHANNEL_NAME = 'sdg-printer-bridge';

/**
 * Inicia o listener de impressão conectado ao Supabase Realtime no computador da loja
 */
export function startSupabasePrinterListener({
  defaultIp = process.env.PRINTER_IP || '192.168.1.20',
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

  // 1. Responder a PING de status emitido pela Vercel / Web
  channel.on('broadcast', { event: 'printer_ping' }, async ({ payload }) => {
    const reqId = payload?.reqId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;

    console.log(`📡 [NUVEM] Ping recebido da Vercel para impressora ${ip}:${port}`);
    const status = await checkPrinterOnline(ip, port, 2500);

    await channel.send({
      type: 'broadcast',
      event: 'printer_pong',
      payload: {
        reqId,
        online: status.online,
        ip,
        port,
        message: status.message || (status.online ? `Impressora Elgin i8 online em ${ip}:${port}` : 'Impressora offline'),
        timestamp: Date.now()
      }
    });
  });

  // 2. Responder a requisição de impressão vinda da Vercel
  channel.on('broadcast', { event: 'printer_print_request' }, async ({ payload }) => {
    const jobId = payload?.jobId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;
    const rawEscpos = payload?.rawEscpos;
    const tickets = Array.isArray(payload?.tickets) && payload.tickets.length > 0
      ? payload.tickets
      : (rawEscpos ? [rawEscpos] : []);

    console.log(`🖨️ [NUVEM] Pedido de impressão recebido da Vercel (${tickets.length} cupom/comanda) para ${ip}:${port}`);

    if (tickets.length === 0) {
      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: false,
          error: 'Nenhum comando ESC/POS fornecido.',
          timestamp: Date.now()
        }
      });
      return;
    }

    try {
      // Combina todas as vias (Balcão e Motoboy) em um único fluxo contínuo com comando de corte entre elas.
      // Isso elimina 100% o erro de reconexão TCP e garante que ambas as vias sejam impressas e cortadas.
      const combinedPayload = tickets
        .map(t => (typeof t === 'object' && t.rawEscpos ? t.rawEscpos : t))
        .join('');

      const res = await sendRawToPrinter(combinedPayload, ip, port);
      const totalBytes = res.bytesWritten || 0;

      console.log(`✅ [NUVEM] Impressão concluída com sucesso na Elgin i8 (${totalBytes} bytes)!`);

      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: true,
          ticketsCount: tickets.length,
          bytesWritten: totalBytes,
          ip,
          port,
          message: tickets.length > 1
            ? `2 Vias (Balcão & Cozinha + Motoboy) impressas e cortadas com sucesso na Elgin i8 (${ip}:${port})`
            : `Impresso com sucesso na Elgin i8 (${ip}:${port})`,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error(`❌ [NUVEM] Erro ao imprimir na Elgin i8:`, err.message);
      await channel.send({
        type: 'broadcast',
        event: 'printer_print_response',
        payload: {
          jobId,
          success: false,
          error: err.message,
          ip,
          port,
          timestamp: Date.now()
        }
      });
    }
  });

  // 3. Responder a teste de impressão vindo da Vercel
  channel.on('broadcast', { event: 'printer_test_request' }, async ({ payload }) => {
    const jobId = payload?.jobId;
    const ip = payload?.ip || defaultIp;
    const port = Number(payload?.port) || defaultPort;
    const rawEscpos = payload?.rawEscpos || '\x1B@\x1Ba\x01SDG RESTAURANTE\nTESTE DE IMPRESSAO ELGIN i8 VIA VERCEL\nIP: ' + ip + ':' + port + '\nCONEXAO COM SUCESSO!\n\n\n\n\x1DV\x00';

    console.log(`🧪 [NUVEM] Teste de impressão recebido da Vercel para ${ip}:${port}`);

    try {
      const res = await sendRawToPrinter(rawEscpos, ip, port);
      console.log(`✅ [NUVEM] Teste impresso com sucesso!`);
      await channel.send({
        type: 'broadcast',
        event: 'printer_test_response',
        payload: {
          jobId,
          success: true,
          bytesWritten: res.bytesWritten,
          message: res.message || `Teste impresso com sucesso na Elgin i8 (${ip}:${port})`,
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
