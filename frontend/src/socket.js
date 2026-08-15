import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1';
// Socket.IO lives on the API origin (no /api/v1 suffix).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/v1\/?$/, '');

let socket = null;

/** Get (or lazily create) the app's authenticated socket. */
export function getSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('access_token') || '' },
  });
  // If the access token changes (e.g. refreshed), reconnect with the fresh one.
  socket.on('connect_error', () => {
    const token = localStorage.getItem('access_token');
    if (token && socket.auth.token !== token) {
      socket.auth = { token };
      socket.connect();
    } else if (!token) {
      socket.disconnect(); // logged out — stop trying until reset
    }
  });
  return socket;
}

/** Drop the current socket (on login/logout so sessions never leak). */
export function resetSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
