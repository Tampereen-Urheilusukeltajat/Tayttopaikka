import { createLogger, format, type Logger, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for cleaner, more readable logs
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${String(timestamp)} [${String(level)}]: ${String(message)}`;

  // Add metadata if present
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    // Filter out Symbol keys and internal winston properties
    const filteredMetadata: Record<string, unknown> = Object.keys(metadata)
      .filter((key) => !key.startsWith('Symbol') && key !== 'level')
      .reduce<Record<string, unknown>>((obj, key) => {
        obj[key] = metadata[key];
        return obj;
      }, {});

    if (Object.keys(filteredMetadata).length > 0) {
      msg += `\n${JSON.stringify(filteredMetadata, null, 2)}`;
    }
  }

  return msg;
});

export const log: Logger = createLogger({
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    customFormat,
  ),
  transports: [new transports.Console()],
});

// Fastify-compatible logger adapter
export const fastifyLogger = {
  level: process.env.LOG_LEVEL ?? 'info',
  stream: {
    write: (message: string) => {
      // Parse Fastify's JSON log format and log with winston
      try {
        const logObj = JSON.parse(message);
        const { level, msg, req, res, responseTime, ...rest } = logObj;

        // Map pino levels to winston levels
        const levelMap: Record<number, string> = {
          10: 'debug',
          20: 'debug',
          30: 'info',
          40: 'warn',
          50: 'error',
          60: 'error',
        };

        const winstonLevel = levelMap[level] || 'info';

        // Format request/response info
        let formattedMsg = msg;
        if (req && res) {
          formattedMsg = `${req.method} ${req.url} - ${res.statusCode} [${responseTime}ms]`;
        }

        // Log with winston
        log[winstonLevel as keyof Logger](formattedMsg, {
          ...(req && { method: req.method, url: req.url }),
          ...(res && { statusCode: res.statusCode }),
          ...(responseTime && { responseTime: `${responseTime}ms` }),
          ...rest,
        });
      } catch (e) {
        // If not JSON, just log the raw message
        log.info(message.trim());
      }
    },
  },
};
