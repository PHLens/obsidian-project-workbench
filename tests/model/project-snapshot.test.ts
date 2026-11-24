import { describe, expect, it } from 'vitest';
import { buildProjectSnapshot, isExplicitPendingInput, type VaultFile } from '../../src/model/project-snapshot';

const file = (path: string, content: string): VaultFile => ({ path, content });

const files: VaultFile[] = [
  file('Projects/Demo Project.md', `---\ntype: project\ntitle: Demo Project\nstatus: proposed\nproblems: ["[[Workload Expansion]]", "[[Precision Study]]"]\nfocus_problems: ["[[Workload Expansion]]"]\ncurrent_gate: gate\nnext_milestone: milestone\n---\n# Demo Project\n\nGoal body.`),
  file('Problems/Workload Expansion.md', `---\ntype: problem\ntags: [research, problem]\nup: "[[Demo Project]]"\nstatus: exploring\nproject: "[[Demo Project]]"\n---\n# Workload Expansion\n\n## Overview\nQuestion\n\n## Next Step\n- [ ] Select workload #task`),
  file('Problems/Precision Study.md', `---\ntype: problem\ntags: [research, problem]\nup: "[[Demo Project]]"\nstatus: exploring\nproject: "[[Demo Project]]"\n---\n# Precision Study\n\nQuestion`),
  file('Tasks/Select representative workload.md', `---\nstatus: open\ntags: [task]\nprojects: ["[[Demo Project]]", "[[Workload Expansion]]"]\n---\n# task`),
  file('Inputs/待讨论.md', `---\ntype: idea\ntags: [research, idea]\nproject: "[[Demo Project]]"\npending: true\n---\n# input\nA possible concern.`),
  file('Records/2026-11-22.md', `## Research\n\n### 20:00 · Demo Project update\n\nUpdated baseline. [[Workload Expansion]]`),
];

describe('project snapshot', () => {
  it('builds Demo Project scope, summaries, tasks, pending input and records', () => {
    const snapshot = buildProjectSnapshot(files, 'Projects/Demo Project.md');
    expect(snapshot.project.title).toBe('Demo Project');
    expect(snapshot.problems.map((p) => p.title)).toEqual(['Workload Expansion', 'Precision Study']);
    expect(snapshot.focusProblemPaths).toEqual(['Problems/Workload Expansion.md']);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.pendingInputs).toHaveLength(1);
    expect(snapshot.records).toHaveLength(1);
  });

  it('only treats explicit pending markers as pending', () => {
    expect(isExplicitPendingInput({ path: 'x.md', content: '---\npending: true\n---\n', frontmatter: { pending: true } })).toBe(true);
    expect(isExplicitPendingInput({ path: 'y.md', content: 'A normal link [[Demo Project]]', frontmatter: {} })).toBe(false);
  });
});
