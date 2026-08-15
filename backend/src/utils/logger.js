const LEVELS = ['debug', 'info', 'warn', 'error'];

function write(level, ...args) {
  // In production only warn/error are printed by default.
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

const logger = {
  debug: (...args) => write('debug', ...args),
  info: (...args) => write('info', ...args),
  warn: (...args) => write('warn', ...args),
  error: (...args) => write('error', ...args),
  level: (lvl) => (LEVELS.includes(lvl) ? lvl : 'info'),
};

export default logger;
