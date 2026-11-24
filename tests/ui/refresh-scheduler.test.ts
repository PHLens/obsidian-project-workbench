import { describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler } from '../../src/ui/refresh-scheduler';
import { getUnassociatedProblemCandidates } from '../../src/ui/problem-candidates';

describe('refresh scheduler', () => {
  it('coalesces repeated requests into one callback', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createRefreshScheduler(run, 25);

    scheduler.request();
    scheduler.request();
    scheduler.request();
    vi.advanceTimersByTime(24);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(run).toHaveBeenCalledTimes(1);
    scheduler.dispose();
    vi.useRealTimers();
  });

  it('does not run a pending callback after disposal', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createRefreshScheduler(run, 25);

    scheduler.request();
    scheduler.dispose();
    vi.advanceTimersByTime(25);

    expect(run).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('derives association candidates from the already loaded files', () => {
    const candidates = getUnassociatedProblemCandidates([
      { path: 'Problems/First.md', content: '', mtime: 1 },
      { path: 'Problems/Already.md', content: '', mtime: 2 },
      { path: 'Other/Not a problem.md', content: '', mtime: 3 },
    ], new Set(['Problems/Already.md']), ['Problems']);
    expect(candidates).toEqual([{ path: 'Problems/First.md', title: 'First' }]);
  });
});
