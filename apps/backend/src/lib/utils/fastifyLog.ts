import { log, stringifyInline } from './log';

type HandlerResult = { handled: false } | { handled: true; text?: string };

// Mapping of pino numeric levels → Winston string levels
const levelMap: Record<number, string> = {
  10: 'debug',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'error',
};

/**
 * Round a millisecond count to one decimal place and append “ms”.
 */
const roundMs = (n: number): string => `${Math.round(n * 10) / 10}ms`;

/**
 * Pull the first line of a stack trace (or message) from an error‑like object.
 */
const extractFirstStackLine = (candidate: unknown): string | null => {
  if (!candidate) return null;
  const stack = (candidate as any).stack || (candidate as any).message || null;
  if (!stack) return null;
  return String(stack).split('\n')[0];
};

/**
 * Build an array of “key=value” strings from a record of extra fields.
 * Certain noisy keys are omitted by default.
 */
const buildMetadata = (
  fields: Record<string, unknown>,
  extra?: string[],
): string[] => {
  const skip = new Set([
    'time',
    'pid',
    'hostname',
    'v',
    'remoteAddress',
    'ip',
    'from',
  ]);

  const meta: string[] = extra ? [...extra] : [];

  for (const [key, value] of Object.entries(fields)) {
    if (skip.has(key)) continue;
    meta.push(`${key}=${stringifyInline(value)}`);
  }
  return meta;
};

/* ------------------------------------------------------------------
 * Request‑ID cache (correlates incoming & completed logs)
 * ------------------------------------------------------------------ */
// NOTE: In production you may want an LRU/TTL cache to bound memory usage.
const requestCache = new Map<string, { method: string; url: string }>();

/* ------------------------------------------------------------------
 * Individual log‑line handlers
 * ------------------------------------------------------------------ */

/**
 * Handles “incoming request” messages.
 * Stores method+url in the cache (unless it’s an OPTIONS preflight).
 */
const handleIncoming = (
  logMessage: unknown,
  req: any,
  reqId?: string,
): HandlerResult => {
  if (logMessage !== 'incoming request' || !req) return { handled: false };
  if (req.method === 'OPTIONS') return { handled: true }; // silent ignore

  if (reqId) requestCache.set(reqId, { method: req.method, url: req.url });
  return { handled: true, text: `→ ${req.method} ${req.url}` };
};

/**
 * Handles “request completed” messages.
 * Retrieves the cached request info, builds a concise summary,
 * and removes the cache entry.
 */
const handleCompleted = (
  logMessage: unknown,
  res: any,
  responseTime: unknown,
  reqId: string | undefined,
  extraFields: Record<string, unknown>,
): HandlerResult => {
  if (logMessage !== 'request completed' || !res) return { handled: false };

  const cached = reqId ? requestCache.get(reqId) : null;

  // Skip logging for OPTIONS or empty 204 responses
  if (cached?.method === 'OPTIONS' || (!cached && res.statusCode === 204)) {
    if (reqId) requestCache.delete(reqId);
    return { handled: true };
  }

  const base = cached
    ? `← ${cached.method} ${cached.url} - ${res.statusCode}`
    : `← ${res.statusCode}`;

  const extra =
    responseTime !== undefined ? [roundMs(responseTime as number)] : [];
  const meta = buildMetadata(extraFields, extra);

  if (reqId) requestCache.delete(reqId);

  const text = meta.length > 0 ? `${base} [${meta.join(', ')}]` : base;
  return { handled: true, text };
};

/**
 * Fallback handler for logs that already contain request & response objects.
 */
const handleReqRes = (
  req: any,
  res: any,
  responseTime: unknown,
  extraFields: Record<string, unknown>,
): HandlerResult => {
  if (!req || !res) return { handled: false };

  const base = `${req.method} ${req.url} - ${res.statusCode}`;
  const extra =
    responseTime !== undefined ? [roundMs(responseTime as number)] : [];
  const meta = buildMetadata(extraFields, extra);

  const text = meta.length > 0 ? `${base} [${meta.join(', ')}]` : base;
  return { handled: true, text };
};

/**
 * Generic handler for any other log line.
 * If the Winston level is “error”, we surface the first stack line.
 */
const handleGeneric = (
  logMessage: unknown,
  extraFields: Record<string, unknown>,
  winstonLevel: string,
): HandlerResult => {
  const meta = buildMetadata(extraFields);

  if (winstonLevel === 'error') {
    const errCandidate =
      (extraFields as any).err || (extraFields as any).error || extraFields;
    const firstLine = extractFirstStackLine(errCandidate);
    if (firstLine) meta.push(`stack=${stringifyInline(firstLine)}`);
  }

  const text =
    meta.length > 0 ? `${logMessage} [${meta.join(', ')}]` : String(logMessage);
  return { handled: true, text };
};

/* ------------------------------------------------------------------
 * Exported Fastify logger compatible with pino’s stream interface
 * ------------------------------------------------------------------ */
export const fastifyLogger = {
  level: process.env.LOG_LEVEL ?? 'info',
  stream: {
    write: (message: string) => {
      try {
        // Fastify emits JSON strings – parse them first
        const parsed = JSON.parse(message) as any;

        const { level, msg, req, res, responseTime, reqId, ...extraFields } =
          parsed;

        const winstonLevel = levelMap[level] ?? 'info';

        // Try each specialised handler in order of specificity
        const incoming = handleIncoming(msg, req, reqId);
        if (incoming.handled) {
          if (incoming.text) (log as any)[winstonLevel](incoming.text);
          return;
        }

        const completed = handleCompleted(
          msg,
          res,
          responseTime,
          reqId,
          extraFields,
        );
        if (completed.handled) {
          if (completed.text) (log as any)[winstonLevel](completed.text);
          return;
        }

        const reqRes = handleReqRes(req, res, responseTime, extraFields);
        if (reqRes.handled) {
          if (reqRes.text) (log as any)[winstonLevel](reqRes.text);
          return;
        }

        const generic = handleGeneric(msg, extraFields, winstonLevel);
        if (generic.handled && generic.text) {
          (log as any)[winstonLevel](generic.text);
        }
      } catch (e) {
        // If parsing fails, fall back to logging the raw line for visibility
        log.info(message.trim());
      }
    },
  },
};
