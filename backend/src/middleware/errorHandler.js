import logger from '../utils/logger.js';

/** 404 handler for unknown routes. */
export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

/** Central error handler — the last middleware in the chain. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const fields = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
    return res.status(400).json({ error: { message: 'Validation failed', fields } });
  }

  // Duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({ error: { message: 'A record with that value already exists' } });
  }

  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  return res.status(status).json({ error: { message } });
}
