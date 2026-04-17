export const logger = {
  info(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[PestTrace] ${message}`);
    }
  },
  warn(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[PestTrace] ${message}`);
    }
  },
  error(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[PestTrace] ${message}`);
    }
  },
};
