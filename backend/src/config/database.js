import mongoose from 'mongoose';
import env from './environment.js';
import logger from '../utils/logger.js';
import '../models/index.js'; // register every model so all indexes get built

/**
 * Connect to MongoDB. If the connection fails (e.g. MongoDB is not running),
 * we log a clear warning and continue so the API server can still boot and
 * /api/v1/health can report the database status.
 */
export async function connectDatabase() {
  try {
    // Fail fast instead of buffering model operations for 10s when disconnected.
    // Must run AFTER models are registered: mongoose's model.init()/index build
    // breaks (this.db undefined) when bufferCommands=false is set before
    // model registration, and index-build failures are silently swallowed.
    mongoose.set('bufferCommands', false);
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    // Build schema indexes (unique indexes, etc.) explicitly — autoIndex is
    // unreliable depending on connection timing and silently skipping it
    // breaks things like unique registration numbers.
    logger.debug(`connection readyState=${mongoose.connection.readyState} db=${!!mongoose.connection.db}`);
    for (const [name, model] of Object.entries(mongoose.models)) {
      await model.init();
      logger.debug(`indexes ready: ${name}`);
    }
    return true;
  } catch (err) {
    logger.warn(
      `Could not connect to MongoDB at ${env.mongodbUri}. ` +
        'Start MongoDB locally or set MONGODB_URI in backend/.env. ' +
        `(${err.message})`
    );
    logger.debug(err.stack);
    return false;
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
