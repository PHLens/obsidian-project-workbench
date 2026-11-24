import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';

// Obsidian owns the view lifecycle and vault API outside the unit-test process.
vi.mock('obsidian', () => ({
  ItemView: class {
    app: unknown;
    constructor(leaf: { app: unknown }) { this.app = leaf.app; }
    registerEvent() {}
  },
  Modal: class {},
  Notice: class {},
  TFile: class {},
  Menu: class {},
  ConfirmationModal: class {},
}));

import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
import type { WorkbenchActions } from '../../src/ui/components/workbench-shell';

function setup(scope = { projectDirectories: ['Projects'], problemDirectories: ['Problems'] }) {
  const files = [
    { path: 'Projects/Demo.md', stat: { mtime: 1 } },
    { path: 'Problems/Q.md', stat: { mtime: 2 } },
    { path: 'Archive/Unrelated.md', stat: { mtime: 3 } },
  ];
  const handlers = new Map<string, (file: { path: string }) => void>();
  const read = vi.fn(async (file: { path: string }) => file.path === 'Projects/Demo.md'
    ? '---\ntype: project\nproblems: ["[[Q]]"]\n---\n# Demo'
    : '---\ntype: problem\n---\n# Q');
  const app = { vault: {
    getMarkdownFiles: () => files,
    read,
    on: (event: string, handler: (file: { path: string }) => void) => { handlers.set(event, handler); return {}; },
  } };
  const view = new ResearchWorkbenchView({ app } as unknown as WorkspaceLeaf, scope);
  const internals = view as unknown as { render(): void; actions(): WorkbenchActions };
  const render = vi.spyOn(internals, 'render').mockImplementation(() => {});
  return { view, read, render, handlers, actions: () => internals.actions() };
}

afterEach(() => vi.useRealTimers());

describe('workbench scoped loading', () => {
  it('reads only configured Markdown and does not reload for out-of-scope modifications', async () => {
    vi.useFakeTimers();
    const test = setup();
    await test.view.onOpen();
    expect(test.read.mock.calls.map(([file]) => file.path)).toEqual(['Projects/Demo.md', 'Problems/Q.md']);
    test.read.mockClear();
    test.handlers.get('modify')!({ path: 'Archive/Unrelated.md' });
    await vi.runAllTimersAsync();
    expect(test.read).not.toHaveBeenCalled();
    test.view.onunload();
  });

  it('does not read files before data directories are configured', async () => {
    const test = setup({ projectDirectories: [], problemDirectories: [] });
    await test.view.onOpen();
    expect(test.read).not.toHaveBeenCalled();
    test.view.onunload();
  });

  it('coalesces search input and changes panels without reading files again', async () => {
    vi.useFakeTimers();
    const test = setup();
    await test.view.onOpen();
    test.read.mockClear();
    test.render.mockClear();
    test.actions().setQuery('a');
    test.actions().setQuery('ab');
    test.actions().setQuery('abc');
    expect(test.render).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(40);
    expect(test.render).toHaveBeenCalledTimes(1);
    test.actions().selectPanel('records');
    expect(test.read).not.toHaveBeenCalled();
    test.view.onunload();
  });

  it('cancels pending search renders when the view unloads', async () => {
    vi.useFakeTimers();
    const test = setup();
    await test.view.onOpen();
    test.render.mockClear();
    test.actions().setQuery('abc');
    test.view.onunload();
    await vi.runAllTimersAsync();
    expect(test.render).not.toHaveBeenCalled();
  });
});
