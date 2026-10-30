import {failure} from '@/src/api/apiResult';
import {ApiResult} from '@/src/types/importApi';
import {ERROR_KIND, resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';

/** A raw HTTP answer: its status and its body text. */
export type HttpAnswer = {
  status: number;
  body: string;
};

/**
 * Runs one request under our own time limit and gives back its answer, whatever the status.
 * A request stopped by that limit is a TIMEOUT; any other request without an answer is
 * classified by `resolveErrorKind`. Never retries: the wrapper cannot tell a read from a write.
 */
export const runTimedRequest = async (
  send: (signal: AbortSignal) => Promise<HttpAnswer>,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<ApiResult<HttpAnswer>> => {
  const controller = new AbortController();
  const timeout = {fired: false};
  const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
    timeout.fired = true;
    controller.abort();
  }, timeoutMs);
  const abortFromOutside = () => controller.abort();
  externalSignal?.addEventListener('abort', abortFromOutside);
  try {
    return {success: true, payload: await send(controller.signal)};
  } catch (error) {
    if (timeout.fired) {
      return failure(ERROR_KIND.TIMEOUT, null);
    }
    return failure(resolveErrorKind(error), null);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromOutside);
  }
};

/** A JSON-or-empty request through `fetch`, answered with its status and body text. */
export const fetchText = async (
  url: string,
  init: RequestInit,
  signal: AbortSignal
): Promise<HttpAnswer> => {
  const response = await fetch(url, {...init, signal});
  return {status: response.status, body: await response.text()};
};
