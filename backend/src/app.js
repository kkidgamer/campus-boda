import express from 'express';
import cors from 'cors';
import env from './config/environment.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

const app = express();

// Allow any origin in development; restrict via CORS_ORIGIN otherwise.
app.use(
  cors({
    origin: env.nodeEnv === 'development' ? true : env.corsOrigin,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.debug(`${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

// API root — everything is versioned under /api/v1
app.use('/api/v1', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
