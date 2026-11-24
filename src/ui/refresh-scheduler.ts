export interface RefreshScheduler {
  request(): void;
  dispose(): void;
}

export function createRefreshScheduler(schedule: () => void, delayMs = 80): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  return {
    request(): void {
      if (disposed || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!disposed) schedule();
      }, delayMs);
    },
    dispose(): void {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
