import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handlePrinterRoute } from './server/printerBridge.js';

/**
 * Plugin do Vite para integrar a impressora de rede Elgin i8 diretamente no servidor de desenvolvimento
 */
function elginPrinterPlugin() {
  return {
    name: 'sdg-elgin-printer-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/printer') || req.url.startsWith('/print') || req.url.startsWith('/status') || req.url.startsWith('/test'))) {
          try {
            const handled = await handlePrinterRoute(req, res);
            if (handled) return;
          } catch (e) {
            console.error('Erro no middleware da impressora Elgin:', e);
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), elginPrinterPlugin()],
});
