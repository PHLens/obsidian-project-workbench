import { describe, expect, it } from 'vitest';
import { getWorkbenchLayoutState } from '../../src/ui/components/workbench-shell';
import type { ProjectSnapshot } from '../../src/model/types';
import { DEFAULT_WORKBENCH_STATE } from '../../src/model/view-state';

describe('research editorial visual semantics', () => {
  it('defines semantic regions beyond color-only state', () => {
    const snapshot: ProjectSnapshot = { schemaVersion: 1, project: { path: 'P.md', title: 'P', source: { path: 'P.md', kind: 'project' } }, problems: [{ path: 'Q.md', title: 'Q', status: 'exploring', stage: 'evaluation', focus: true, nextSteps: [], source: { path: 'Q.md', kind: 'problem' } }], focusProblemPaths: ['Q.md'], tasks: [], pendingInputs: [{ path: 'I.md', title: 'Input', status: 'pending', source: { path: 'I.md', kind: 'input' } }], records: [], generatedAt: 'snapshot' };
    const result = getWorkbenchLayoutState({ state: { ...DEFAULT_WORKBENCH_STATE, projectPath: 'P.md' }, projects: [snapshot.project], snapshot, events: [] });
    expect(result.regions).toEqual(expect.arrayContaining(['focus-panel', 'recent-timeline', 'pending-inbox']));
    expect(result.problemRows[0]).toMatchObject({ status: 'exploring', focus: true, source: 'problem' });
  });
});
