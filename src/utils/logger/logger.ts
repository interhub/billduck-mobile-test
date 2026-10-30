import {LOG_NAME} from '@/src/utils/logger/LOG_NAME';

/**
 * The closed list of fields a log may carry. Any other field is dropped, so file bytes, a file
 * name, an operation description or a payee name cannot reach the console by accident.
 * Extend the list only after a privacy check of the new field.
 */
const ALLOWED_LOG_KEYS = [
  'type',
  'job_id',
  'phase',
  'revision',
  'format',
  'size_kb',
  'error_kind',
  'http_status',
  'attempt'
] as const;

type LogKey = (typeof ALLOWED_LOG_KEYS)[number];
type LogValue = string | number | boolean | null;
type LogLevel = 'LOG' | 'WARN' | 'ERROR';

type LogParams = Partial<Record<LogKey, LogValue>>;

type SplitLogParams = {
  safeParams: Record<string, LogValue>;
  droppedKeys: string[];
};

const ALLOWED_KEY_SET: ReadonlySet<string> = new Set(ALLOWED_LOG_KEYS);
const MAX_STRING_LENGTH = 64;

const resolveLogValue = (value: LogValue | undefined): LogValue | undefined => {
  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  return undefined;
};

/** Keeps only allowed keys with flat primitive values; the rest is reported as dropped. */
const splitLogParams = (params: LogParams | undefined): SplitLogParams => {
  const safeParams: Record<string, LogValue> = {};
  const droppedKeys: string[] = [];
  if (!params) {
    return {safeParams, droppedKeys};
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    const safeValue = resolveLogValue(value);
    if (!ALLOWED_KEY_SET.has(key) || safeValue === undefined) {
      droppedKeys.push(key);
      continue;
    }
    safeParams[key] = safeValue;
  }
  return {safeParams, droppedKeys};
};

const writeLog = (level: LogLevel, title: LOG_NAME, params: LogParams | undefined): void => {
  if (!__DEV__) {
    return;
  }
  const {safeParams, droppedKeys} = splitLogParams(params);
  console.log(`[${level}] ${title} ${JSON.stringify(safeParams)}`);
  if (droppedKeys.length > 0) {
    console.warn(`[logger] dropped fields outside the allowed list: ${droppedKeys.join(', ')}`);
  }
};

/**
 * The only writer to the console. Debug builds print, release builds stay silent: nothing is
 * sent anywhere.
 * d: a technical step. w: a notice that is not a failure. e: a failure.
 */
export const logger = {
  d: (title: LOG_NAME, params?: LogParams): void => {
    writeLog('LOG', title, params);
  },
  w: (title: LOG_NAME, params?: LogParams): void => {
    writeLog('WARN', title, params);
  },
  e: (title: LOG_NAME, params?: LogParams): void => {
    writeLog('ERROR', title, params);
  }
};
