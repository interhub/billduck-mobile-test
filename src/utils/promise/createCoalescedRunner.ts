/** Runs a pass of the task, or asks the running pass for one more. */
export type CoalescedRunner = (task: () => Promise<void>) => Promise<void>;

/**
 * One pass at a time: a start while a pass runs is not lost, it asks for exactly one more pass
 * once the running one ends, however many starts come meanwhile.
 */
export const createCoalescedRunner = (): CoalescedRunner => {
  const state = {isRunning: false, isRequested: false};
  return async (task) => {
    if (state.isRunning) {
      state.isRequested = true;
      return;
    }
    state.isRunning = true;
    try {
      do {
        state.isRequested = false;
        await task();
      } while (state.isRequested);
    } finally {
      state.isRunning = false;
    }
  };
};
