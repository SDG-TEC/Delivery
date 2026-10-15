// ==============================================================================
// 🖨️ SDG Delivery - Servidor Local de Impressão Térmica Elgin i8 (Porta 3001)
// ==============================================================================
import http from 'http';
import { handlePrinterRoute, checkPrinterOnline } from './server/printerBridge.js';
import { startSupabasePrinterListener } from './server/supabasePrinterBridge.js';

const PORT = process.env.PORT || 3001;
const DEFAULT_PRINTER_IP = process.env.PRINTER_IP || '192.168.1.20';
const DEFAULT_PRINTER_PORT = process.env.PRINTER_PORT || 9100;

const server = http.createServer(async (req, res) => {
  // Rota raiz para conferência do serviço
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <html>
        <head><title>SDG Delivery - Servidor Elgin i8</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1 style="color: #f59e0b;">🖨️ Servidor de Impressão Elgin i8 Ativo</h1>
          <p>Pronto para receber pedidos de <b>Cozinha</b> e <b>Balcão</b> via ESC/POS.</p>
          <div style="margin: 20px auto; max-width: 400px; padding: 16px; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
            <p><b>IP Padrão da Impressora:</b> ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}</p>
            <p><b>Status da API:</b> <span style="color: #10b981;">Online (Porta ${PORT})</span></p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Se a rota iniciar com /api/printer ou for direta (/print, /status)
  if (req.url.startsWith('/api/printer') || req.url.startsWith('/print') || req.url.startsWith('/status') || req.url.startsWith('/test')) {
    if (!req.url.startsWith('/api/printer')) {
      req.url = '/api/printer' + req.url;
    }
    const handled = await handlePrinterRoute(req, res);
    if (handled) return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log('================================================================');
  console.log(`🖨️  SDG DELIVERY - SERVIDOR DE IMPRESSÃO ELGIN i8 INICIADO`);
  console.log(`🌐 Servidor HTTP rodando em: http://localhost:${PORT}`);
  console.log(`🎯 Impressora Elgin configurada: ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}`);
  console.log('================================================================');

  // Faz teste rápido de ping na inicialização
  const status = await checkPrinterOnline(DEFAULT_PRINTER_IP, DEFAULT_PRINTER_PORT, 2000);
  if (status.online) {
    console.log(`✅ Impressora Elgin i8 conectada e respondendo na rede!`);
  } else {
    console.log(`⚠️  Impressora não respondeu no momento (${status.message}).`);
  }

  // Ativa a Ponte em Nuvem (Supabase Realtime) para permitir impressões vindas da Vercel (HTTPS)
  try {
    startSupabasePrinterListener({
      defaultIp: DEFAULT_PRINTER_IP,
      defaultPort: DEFAULT_PRINTER_PORT
    });
  } catch (e) {
    console.error('Erro ao conectar ponte em nuvem:', e.message);
  }
});
