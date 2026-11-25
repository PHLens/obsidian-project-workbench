import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import { setupDom } from '../helpers/dom';
import { interactiveVault } from '../helpers/interactive-vault';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('template settings in the live workbench', () => {
  it('updates template paths without rereading the snapshot or changing the active DOM', async () => {
    setupDom();
    const test = interactiveVault({ 'Projects/P.md': '---\ntype: project\n---\n# P' });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, { projectDirectories: ['Projects'] }, { templatePaths: { project: 'Templates/project.md' } });
    await view.onOpen();
    const root = view.contentEl.querySelector('.research-workbench');
    test.read.mockClear();
    view.setTemplatePaths({ project: 'Templates/updated.md', problem: 'Templates/problem.md' });
    expect(view.contentEl.querySelector('.research-workbench')).toBe(root);
    expect(test.read).not.toHaveBeenCalled();
    expect((view as any).templatePaths).toMatchObject({ project: 'Templates/updated.md', problem: 'Templates/problem.md' });
    view.onunload();
  });

  it('excludes a configured template inside a data directory from snapshots', async () => {
    setupDom();
    const test = interactiveVault({
      'Projects/P.md': '---\ntype: project\n---\n# P',
      'Projects/_template.md': '---\ntype: project\n---\n# Template content',
    });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, { projectDirectories: ['Projects'] }, { templatePaths: { project: 'Projects/_template.md' } });
    await view.onOpen();
    expect((view as any).cachedProjects.map((project: { path: string }) => project.path)).toEqual(['Projects/P.md']);
    view.onunload();
  });
});
