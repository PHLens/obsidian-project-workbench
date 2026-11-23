import { describe, expect, it } from 'vitest';
import { getWorkbenchLayoutState } from '../../src/ui/components/workbench-shell';
import type { ProjectSnapshot } from '../../src/model/types';
import { DEFAULT_WORKBENCH_STATE } from '../../src/model/view-state';

describe('mobile workbench layout', () => {
  it('keeps the same semantic regions and actions for narrow screens', () => {
    const snapshot: ProjectSnapshot = { schemaVersion: 1, project: { path: 'P.md', title: 'P', source: { path: 'P.md', kind: 'project' } }, problems: [], focusProblemPaths: [], tasks: [], pendingInputs: [], records: [], generatedAt: 'snapshot' };
    const result = getWorkbenchLayoutState({ state: { ...DEFAULT_WORKBENCH_STATE, projectPath: 'P.md' }, projects: [snapshot.project], snapshot, events: [] });
    expect(result.regions).toEqual(expect.arrayContaining(['project-sidebar', 'main-workspace', 'focus-panel', 'recent-timeline', 'pending-inbox']));
    expect(result.actions).toEqual(expect.arrayContaining(['新建项目', '记录想法', '新建问题', '从已有问题关联']));
  });
});
