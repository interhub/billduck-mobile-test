export type WaitFunction = (durationMs: number) => Promise<void>;

/** Resolves after `durationMs` milliseconds. */
export const wait = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};
