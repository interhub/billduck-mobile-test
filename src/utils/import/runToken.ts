/** Binds an async step to the operation it was started for and to the generation of that start. */
export type RunToken = {
  operationId: string;
  generation: number;
};

/** Polling, recovery and deletion each allow one run per token at a time. */
export const runIdOf = (token: RunToken): string => `${token.operationId}:${token.generation}`;

/**
 * An answer counts only while its token names the operation the phone works on, in the same
 * generation: once that operation is closed the generation grows and every late answer is dropped.
 */
export const isTokenCurrent = (
  token: RunToken,
  generation: number,
  operationId: string | null
): boolean => {
  return token.generation === generation && token.operationId === operationId;
};
