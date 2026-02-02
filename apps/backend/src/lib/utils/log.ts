import { createLogger, format, type Logger, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

/**
 * Convert any value to a short, readable string.
 * Objects are JSON‑stringified; Errors become “ErrorName: message”.
 */
export const stringifyInline = (obj: unknown): string => {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (obj instanceof Error) return `${obj.name}: ${obj.message}`;
  if (typeof obj === 'object') return JSON.stringify(obj);
  return String(obj);
};

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const base = `${timestamp} [${level}]: ${message}`;

  // Filter out Symbol‑prefixed keys and the built‑in level field
  const filteredKeys = Object.keys(metadata).filter(
    (k) => !k.startsWith('Symbol') && k !== 'level',
  );

  if (filteredKeys.length === 0) return base;

  const metaStr = filteredKeys
    .map((k) => `${k}=${stringifyInline((metadata as any)[k])}`)
    .join(' ');
  return `${base} ${metaStr}`;
});

export const log: Logger = createLogger({
  format: combine(
    errors({ stack: true }), // Preserve error stacks
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    customFormat,
  ),
  transports: [new transports.Console()],
});
