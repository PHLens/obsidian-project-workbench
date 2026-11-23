import { describe, expect, it } from 'vitest';
import { getWorkbenchLayoutState } from '../../src/ui/components/workbench-shell';
import type { ProjectSnapshot } from '../../src/model/types';
import { DEFAULT_WORKBENCH_STATE } from '../../src/model/view-state';

const snapshot = (problems: any[] = []): ProjectSnapshot => ({ schemaVersion: 1, project: { path: 'P.md', title: 'Demo Project', source: { path: 'P.md', kind: 'project' } }, problems, focusProblemPaths: [], tasks: [], pendingInputs: [], records: [], generatedAt: 'snapshot' });
const context = (s: ProjectSnapshot) => ({ state: { ...DEFAULT_WORKBENCH_STATE, projectPath: 'P.md' }, projects: [s.project], snapshot: s, events: [] });

describe('workbench render state', () => {
  it('exposes the editorial three-column shell and five navigation items', () => {
    const state = getWorkbenchLayoutState(context(snapshot()));
    expect(state.regions).toEqual(['topbar', 'project-sidebar', 'main-workspace', 'focus-panel', 'recent-timeline', 'pending-inbox']);
    expect(state.navigation).toEqual(['项目工作台', '阶段目标', '进展记录', '收件箱', '项目笔记']);
  });
  it('exposes explicit empty state actions without inferred problems', () => {
    const state = getWorkbenchLayoutState(context(snapshot()));
    expect(state.emptyProblemState).toBe(true);
    expect(state.problemRows).toEqual([]);
    expect(state.actions).toContain('从已有问题关联');
  });
  it('keeps problem rows and actions in narrow layouts', () => {
    const problem = { path: 'Q.md', title: '复杂 workload', status: 'exploring', focus: true, nextSteps: [], source: { path: 'Q.md', kind: 'problem' } };
    const state = getWorkbenchLayoutState(context(snapshot([problem])));
    expect(state.problemRows[0]).toMatchObject({ title: '复杂 workload', focus: true });
    expect(state.actions).toEqual(expect.arrayContaining(['新建问题', '记录想法']));
  });
});
