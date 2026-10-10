import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { createApp } from './app';

const production = process.argv.includes('--production');
const app = createApp({
  baseUrl: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,
});
const server = createServer(app);
let closeVite: (() => Promise<void>) | undefined;
if (production) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: 'custom',
  });
  closeVite = () => vite.close();
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    try {
      const template = await readFile(resolve('index.html'), 'utf-8');
      res
        .status(200)
        .set('Content-Type', 'text/html')
        .end(await vite.transformIndexHtml(req.originalUrl, template));
    } catch (error) {
      next(error);
    }
  });
}
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
server.listen(port, host, () =>
  console.log(
    `\n  Intelligent UI Lab ready\n  Local: http://${host}:${port}\n  Mode: ${production ? 'production' : 'development'}\n`,
  ),
);
server.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
const shutdown = async () => {
  await closeVite?.();
  server.closeAllConnections();
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
