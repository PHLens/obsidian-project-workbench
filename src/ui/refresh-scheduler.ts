export interface RefreshScheduler { request(): void; dispose(): void; }
export function createRefreshScheduler(schedule: () => void, delayMs = 250, maxWaitMs = 1500): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    if (deadline !== undefined) clearTimeout(deadline);
    timer = undefined; deadline = undefined;
  };
  const run = () => { clear(); if (!disposed) schedule(); };
  return {
    request(): void {
      if (disposed) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(run, delayMs);
      if (deadline === undefined) deadline = setTimeout(run, Math.max(delayMs, maxWaitMs));
    },
    dispose(): void { disposed = true; clear(); },
  };
}
