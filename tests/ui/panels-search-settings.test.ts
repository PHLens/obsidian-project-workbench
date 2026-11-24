import { describe, expect, it } from 'vitest';
import { searchWorkbench } from '../../src/ui/search/workbench-search';
import { renderPanelState } from '../../src/ui/panels/workspace-panel';
import type { ProjectSnapshot } from '../../src/model/types';
import { DEFAULT_SETTINGS } from '../../src/ui/settings-model';

const snapshot: ProjectSnapshot = {
  schemaVersion: 1,
  project: { path: 'P.md', title: 'Demo Project', goal: '迁移目标', currentGate: 'gate', nextMilestone: 'milestone', source: { path: 'P.md', kind: 'project' } },
  problems: [{ path: 'Q.md', title: '复杂 workload', status: 'exploring', stage: 'evaluation', researchRole: 'mainline', focus: true, summary: '补足能力缺口', nextSteps: ['选取 workload'], source: { path: 'Q.md', kind: 'problem' } }],
  focusProblemPaths: ['Q.md'],
  tasks: [{ path: 'T.md', title: '选取 workload', status: 'open', projects: ['[[P]]'], source: { path: 'T.md', kind: 'task' } }],
  pendingInputs: [{ path: 'I.md', title: '低精度方向', status: 'pending', project: '[[P]]', source: { path: 'I.md', kind: 'input' } }],
  records: [{ path: 'D.md', title: 'Demo Project progress', date: '2026-11-22', source: { path: 'D.md', kind: 'record' } }],
  generatedAt: 'snapshot',
};

describe('workbench panels, search, and settings', () => {
  it('defines content and actions for all five panels', () => {
    expect(renderPanelState('workspace', snapshot)).toMatchObject({ kind: 'workspace', regions: ['sidebar', 'main', 'right-rail'] });
    expect(renderPanelState('goals', snapshot)).toMatchObject({ kind: 'goals', fields: ['current_gate', 'next_milestone', 'success_criteria'] });
    expect(renderPanelState('records', snapshot).items).toEqual(['Demo Project progress']);
    expect(renderPanelState('inbox', snapshot).items).toEqual(['低精度方向']);
    expect(renderPanelState('project-note', snapshot).openPath).toBe('P.md');
  });
  it('searches summary fields by default and body only with full text', () => {
    expect(searchWorkbench(snapshot, '能力缺口', { fullText: false }).map((x) => x.title)).toEqual(['复杂 workload']);
    expect(searchWorkbench({ ...snapshot, problems: [{ ...snapshot.problems[0], summary: undefined, searchText: 'deep body needle' }] }, 'deep body needle', { fullText: false })).toEqual([]);
    expect(searchWorkbench({ ...snapshot, problems: [{ ...snapshot.problems[0], summary: undefined, searchText: 'deep body needle' }] }, 'deep body needle', { fullText: true }).map((x) => x.title)).toEqual(['复杂 workload']);
  });
  it('filters the visible problem list by summary without full text mode', async () => {
    const { filterWorkbenchItems } = await import('../../src/model/project-snapshot');
    expect(filterWorkbenchItems(snapshot, '能力缺口').problems.map((problem) => problem.title)).toEqual(['复杂 workload']);
  });
  it('keeps settings defaults explicit', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ density: 'comfortable', accentMode: 'theme', tagMode: 'full', rightRail: 'fixed', iconStyle: 'linear', projectDirectories: [] });
  });
});
