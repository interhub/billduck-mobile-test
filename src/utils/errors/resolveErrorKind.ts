import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';

/**
 * How a failed network call must be treated by every retry policy in the app.
 * The kind answers one question: can the very same call still succeed later?
 */
export enum ERROR_KIND {
  /** No HTTP answer came back: the connection was refused, reset, dropped or is offline. */
  NETWORK = 'network',
  /** The request ran out of time, including an abort by our own timer. */
  TIMEOUT = 'timeout',
  /** The server answered but broke while handling it (5xx, rate limit, unreadable body). */
  SERVER = 'server',
  /** The request itself is wrong and fails the same way on every attempt (4xx, bad data). */
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/** A cancelled or timed out `fetch` rejects with this error name on every platform. */
const ABORT_ERROR_NAME = 'AbortError';

/**
 * Everything below matches the text of a message and is the LAST RESORT: it exists for
 * errors that come from outside our own code - a platform `fetch`, a native module - and
 * carry no field to read. Code of ours that already knows the kind declares it in `errorKind`,
 * so nobody can turn a retry off by rewording a sentence.
 */

/** How a request that got no answer reads across platforms and network engines. */
const NETWORK_MESSAGE_MARKERS = [
  'network request failed',
  'failed to fetch',
  'network error',
  'network',
  'connection'
];

/** A request that ran out of time, including aborts by our own timer. */
const TIMEOUT_MESSAGE_MARKERS = ['timeout', 'timed out', 'aborted'];

/** Throttling answers normally again after a pause, so it is repeated like a server fault. */
const RATE_LIMIT_MESSAGE_MARKERS = ['rate_limit', 'rate limit', 'too many requests'];

type ErrorLikeShape = {
  name?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  error?: unknown;
  /** Set by our own code that already knows the kind. */
  errorKind?: unknown;
};

const ALL_ERROR_KINDS: readonly ERROR_KIND[] = Object.values(ERROR_KIND);

/**
 * The kind an error states about itself. Read as a plain field rather than by `instanceof`,
 * so a classified error that crossed a module or a bridge is still understood.
 */
const readDeclaredErrorKind = (shape: ErrorLikeShape): ERROR_KIND | null => {
  const declaredKind = shape.errorKind;
  if (typeof declaredKind !== 'string') {
    return null;
  }
  const matchedKind = ALL_ERROR_KINDS.find((kind) => kind === declaredKind);
  return matchedKind ?? null;
};

const readErrorShape = (error: unknown): ErrorLikeShape => {
  if (error === null || typeof error !== 'object') {
    return {};
  }
  return error as ErrorLikeShape;
};

/** A hostile error value must not break the caller, so the message is read without String(). */
const readErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  const {message} = readErrorShape(error);
  if (typeof message === 'string') {
    return message;
  }
  return '';
};

const containsMarker = (message: string, markers: readonly string[]): boolean => {
  return markers.some((marker) => message.includes(marker));
};

/** Classifies a bare HTTP status, for callers that only kept the number. */
export const resolveHttpStatusErrorKind = (status: number): ERROR_KIND => {
  if (status === HTTP_STATUS.REQUEST_TIMEOUT || status === HTTP_STATUS.GATEWAY_TIMEOUT) {
    return ERROR_KIND.TIMEOUT;
  }
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return ERROR_KIND.SERVER;
  }
  if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    return ERROR_KIND.SERVER;
  }
  if (status >= HTTP_STATUS.BAD_REQUEST) {
    return ERROR_KIND.VALIDATION;
  }
  return ERROR_KIND.UNKNOWN;
};

const resolveStatusFieldKind = (shape: ErrorLikeShape): ERROR_KIND => {
  const status = shape.status ?? shape.statusCode;
  if (typeof status !== 'number') {
    return ERROR_KIND.UNKNOWN;
  }
  return resolveHttpStatusErrorKind(status);
};

const resolveMessageKind = (message: string): ERROR_KIND => {
  const lowerCaseMessage = message.toLowerCase();
  if (containsMarker(lowerCaseMessage, RATE_LIMIT_MESSAGE_MARKERS)) {
    return ERROR_KIND.SERVER;
  }
  if (containsMarker(lowerCaseMessage, TIMEOUT_MESSAGE_MARKERS)) {
    return ERROR_KIND.TIMEOUT;
  }
  if (containsMarker(lowerCaseMessage, NETWORK_MESSAGE_MARKERS)) {
    return ERROR_KIND.NETWORK;
  }
  return ERROR_KIND.UNKNOWN;
};

const resolveDirectErrorKind = (error: unknown): ERROR_KIND => {
  if (typeof error === 'number') {
    return resolveHttpStatusErrorKind(error);
  }
  const shape = readErrorShape(error);
  const declaredKind = readDeclaredErrorKind(shape);
  if (declaredKind !== null) {
    return declaredKind;
  }
  const statusKind = resolveStatusFieldKind(shape);
  if (statusKind !== ERROR_KIND.UNKNOWN) {
    return statusKind;
  }
  if (shape.name === ABORT_ERROR_NAME) {
    return ERROR_KIND.TIMEOUT;
  }
  return resolveMessageKind(readErrorMessage(error));
};

/**
 * Turns anything the network layer throws or returns into one kind: a rejected `fetch`, an
 * abort, a bare HTTP status number, a result that carries the failure in its `error` field,
 * or a shape nobody recognises.
 *
 * An aborted request is read as a timeout, because the only abort in the network layer comes
 * from our own request timer. A deliberate user cancellation must be recognised by its own
 * caller before it reaches this classifier.
 */
export const resolveErrorKind = (error: unknown): ERROR_KIND => {
  const directKind = resolveDirectErrorKind(error);
  if (directKind !== ERROR_KIND.UNKNOWN) {
    return directKind;
  }
  const nestedError = readErrorShape(error).error;
  if (nestedError === undefined || nestedError === null || nestedError === error) {
    return ERROR_KIND.UNKNOWN;
  }
  return resolveDirectErrorKind(nestedError);
};
