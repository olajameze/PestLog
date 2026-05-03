type LogLevel = 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  const configured = (process.env.LOG_LEVEL || '').toLowerCase();
  if (configured === 'silent' || configured === 'none') return false;
  if (configured === 'info' || configured === 'warn' || configured === 'error') {
    const order: Record<LogLevel, number> = { info: 1, warn: 2, error: 3 };
    return order[level] >= order[configured];
  }
  if (process.env.NODE_ENV === 'production') {
    return level !== 'info';
  }
  return true;
}

export const logger = {
  info(message: string) {
    if (shouldLog('info')) {
      console.info(`[PestTrace] ${message}`);
    }
  },
  warn(message: string) {
    if (shouldLog('warn')) {
      console.warn(`[PestTrace] ${message}`);
    }
  },
  error(message: string) {
    if (shouldLog('error')) {
      console.error(`[PestTrace] ${message}`);
    }
  },
};
