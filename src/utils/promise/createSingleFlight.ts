/** Starts a task under a run id; resolves with null when that run was already going. */
export type SingleFlight = <T>(runId: string, task: () => Promise<T>) => Promise<T | null>;

/**
 * One run at a time: a start with the id of the running run returns at once, a start with
 * another id takes the slot over. Only the run that still holds the slot frees it.
 */
export const createSingleFlight = (): SingleFlight => {
  const slot: {runId: string | null} = {runId: null};
  return async (runId, task) => {
    if (slot.runId === runId) {
      return null;
    }
    slot.runId = runId;
    try {
      return await task();
    } finally {
      if (slot.runId === runId) {
        slot.runId = null;
      }
    }
  };
};
