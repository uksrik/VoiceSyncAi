import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import ttsHandler from './api/tts.js'
import lipsyncHandler from './api/lipsync.js'
import rewriteHandler from './api/rewrite.js'
import voiceCloneHandler from './api/voice-clone.js'
import transcribeHandler from './api/transcribe.js'
import slideScriptsHandler from './api/slide-scripts.js'

const localApiHandlers = {
  tts: ttsHandler,
  lipsync: lipsyncHandler,
  rewrite: rewriteHandler,
  'voice-clone': voiceCloneHandler,
  transcribe: transcribeHandler,
  'slide-scripts': slideScriptsHandler,
};

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const route = req.url?.split('?')[0]?.replace(/^\/+/, '');
        if (!route || !Object.hasOwn(localApiHandlers, route)) return next();

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const rawBody = Buffer.concat(chunks).toString('utf8');
          req.body = rawBody ? JSON.parse(rawBody) : {};

          const handler = localApiHandlers[route];
          const vercelRes = {
            setHeader: (name, value) => res.setHeader(name, value),
            status(code) {
              res.statusCode = code;
              return this;
            },
            json(payload) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };

          await handler(req, vercelRes);
        } catch (err) {
          console.error(`Local API /api/${route} failed`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Local API failed' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), localApiPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  };
})
