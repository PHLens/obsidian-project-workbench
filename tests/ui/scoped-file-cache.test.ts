import { describe, expect, it, vi } from 'vitest';
import { ScopedFileCache } from '../../src/ui/scoped-file-cache';

describe('scoped file content cache', () => {
  it('reads only changed or explicitly invalidated files', async () => {
    const cache = new ScopedFileCache();
    const files = [{ path: 'Inputs/A.md', stat: { mtime: 1, size: 5 } }, { path: 'Inputs/B.md', stat: { mtime: 1, size: 5 } }];
    const read = vi.fn(async (file: { path: string }) => file.path);
    await cache.load(files, read);
    read.mockClear();
    files[0].stat.mtime = 2;
    await cache.load(files, read);
    expect(read.mock.calls.map(([file]) => file.path)).toEqual(['Inputs/A.md']);
    read.mockClear();
    await cache.load(files, read, new Set(['Inputs/B.md']));
    expect(read.mock.calls.map(([file]) => file.path)).toEqual(['Inputs/B.md']);
  });
  it('evicts deleted or scope-excluded files and rereads them when they return', async () => {
    const cache = new ScopedFileCache();
    const files = [{ path: 'Inputs/A.md', stat: { mtime: 1 } }, { path: 'Inputs/B.md', stat: { mtime: 1 } }];
    const read = vi.fn(async (file: { path: string }) => file.path);
    await cache.load(files, read);
    expect((await cache.load([files[0]], read)).map((file) => file.path)).toEqual(['Inputs/A.md']);
    read.mockClear();
    await cache.load(files, read);
    expect(read.mock.calls.map(([file]) => file.path)).toEqual(['Inputs/B.md']);
  });
});
