import http from 'http';
import app from './app.js';
import env from './config/environment.js';
import { connectDatabase } from './config/database.js';
import { initSocketIO } from './sockets/index.js';
import logger from './utils/logger.js';

async function main() {
  // The HTTP server hosts both the REST API (app) and Socket.IO for
  // real-time ride matching.
  const server = http.createServer(app);
  initSocketIO(server);

  // Start listening immediately so /api/v1/health works even while the
  // database is still connecting (or unavailable in local dev).
  server.listen(env.port, () => {
    logger.info(`Campus Boda API listening on http://127.0.0.1:${env.port} (${env.nodeEnv})`);
    logger.info('Health check: GET /api/v1/health');
  });

  await connectDatabase();
}

main();
