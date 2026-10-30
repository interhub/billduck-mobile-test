import {ApiResult} from '@/src/types/importApi';
import {ERROR_KIND, resolveHttpStatusErrorKind} from '@/src/utils/errors/resolveErrorKind';

/** A failed result: the kind and the HTTP status only, never an error text. */
export const failure = <T>(kind: ERROR_KIND, httpStatus: number | null): ApiResult<T> => ({
  success: false,
  error: {kind, httpStatus}
});

/** A failed result for an answer whose status the call did not expect. */
export const failureForStatus = <T>(status: number): ApiResult<T> =>
  failure(resolveHttpStatusErrorKind(status), status);
