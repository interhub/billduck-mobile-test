/** Queues a task behind the ones already queued and resolves with its result. */
export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Runs async tasks one after another in the order they were queued. A read-modify-write of the
 * stored operation must not interleave with another one, or the second write loses the first.
 */
export const createSerialQueue = (): SerialQueue => {
  const queue: {tail: Promise<void>} = {tail: Promise.resolve()};
  return (task) => {
    const run = queue.tail.then(task, task);
    queue.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
};
