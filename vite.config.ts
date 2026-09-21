import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleInsightsEndpoint } from './server/insightsHandler.ts';

function groqInsightsServerPlugin(): Plugin {
  return {
    name: 'groq-insights-server',
    configureServer(server) {
      server.middlewares.use('/api/insights', (req, res) => {
        handleInsightsEndpoint(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/insights', (req, res) => {
        handleInsightsEndpoint(req, res);
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }
  if (env.GROQ_MODEL) {
    process.env.GROQ_MODEL = env.GROQ_MODEL;
  }
  return {
    plugins: [react(), groqInsightsServerPlugin()],
    server: {
      port: 3000,
      open: false
    }
  };
});
