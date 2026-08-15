import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

let io = null;

/**
 * Attach Socket.IO to the HTTP server.
 *
 * Every socket authenticates with the access token sent in the handshake
 * (`auth.token`) and is joined to:
 *  - `user:<userId>` — targeted events (new-ride pings, ride updates)
 *  - `riders`        — broadcast room for ride-taken notifications
 */
export function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: true, // mirror the REST CORS behaviour (dev: any origin)
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      socket.user = {
        id: payload.sub,
        systemRole: payload.systemRole,
        accountType: payload.accountType,
      };
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.systemRole === 'rider') {
      socket.join('riders');
    }
    logger.debug(`socket connected: user ${socket.user.id} (${socket.user.systemRole})`);
    socket.on('disconnect', () => {
      logger.debug(`socket disconnected: user ${socket.user.id}`);
    });
  });

  return io;
}

/** Get the Socket.IO instance — available after initSocketIO(server). */
export function getIO() {
  return io;
}
