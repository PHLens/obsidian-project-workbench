import { describe, expect, it } from 'vitest';
import { buildProjectIndex, buildProjectSnapshot, filterWorkbenchItems, resolveProjectProblems } from '../../src/model/project-snapshot';
import type { VaultFile } from '../../src/model/types';

const file = (path: string, content: string, mtime?: number): VaultFile => ({ path, content, mtime });

const koram = file('Spaces/Research/Projects/Demo Project.md', `---
type: project
title: Demo Project
status: proposed
problems: []
focus_problems: []
---
# Demo Project

## Research Question

## Next Milestone
目标：完成基础验证
`);
const unrelatedProblem = file('Spaces/Research/Problems/Workload Expansion.md', `---
type: problem
status: exploring
stage: evaluation
research_role: mainline
up: "[[LLM-guided high performance Kernel Generation]]"
---
# Workload Expansion

## Overview
需要补足复杂 workload 的能力。

## Next Step
- [ ] Select representative workload
`);
    const task = file('Spaces/GTD/Tasks/代表性 workload.md', `---
status: in-progress
priority: high
tags: [task]
projects: ["[[P]]"]
archived: true
---
# 代表性 workload
`);

describe('workbench compatibility model', () => {
  it('keeps Demo Project empty when there is no explicit relation', () => {
    const notes = [koram, unrelatedProblem].map((f) => ({ ...f, frontmatter: {} as Record<string, unknown> }));
    const snapshot = buildProjectSnapshot([koram, unrelatedProblem], koram.path);
    expect(resolveProjectProblems(notes[0], notes)).toEqual({ confirmed: [], empty: true });
    expect(snapshot.problems).toEqual([]);
  });

  it('preserves observed legacy status, stage, role, and multiple focus links', () => {
    const project = file('Spaces/Research/Projects/P.md', `---
type: project
title: P
status: proposed
problems: ["[[Q]]", "[[R]]"]
focus_problems: ["[[Q]]", "[[R]]"]
---
# P`);
    const q = file('Spaces/Research/Problems/Q.md', `---
type: problem
status: exploring
stage: evaluation
research_role: mainline
---
# Q`);
    const r = file('Spaces/Research/Problems/R.md', `---
type: problem
status: in-progress
stage: inbox
research_role: probe
---
# R`);
    const snapshot = buildProjectSnapshot([project, q, r], project.path);
    expect(snapshot.problems.map((p) => [p.status, p.stage, p.researchRole])).toEqual([
      ['exploring', 'evaluation', 'mainline'],
      ['in-progress', 'inbox', 'probe'],
    ]);
    expect(snapshot.focusProblemPaths).toEqual(['Spaces/Research/Problems/Q.md', 'Spaces/Research/Problems/R.md']);
  });

  it('filters archived items and searches summary fields by default but body only in full-text mode', () => {
    const project = file('Spaces/Research/Projects/P.md', `---
type: project
title: P
status: active
problems: ["[[Q]]"]
---
# P`);
    const q = file('Spaces/Research/Problems/Q.md', `---
type: problem
status: exploring
stage: evaluation
research_role: probe
---
# Q

## Overview
needle-body-only

## Next Step
- [ ] next action`);
    const snapshot = buildProjectSnapshot([project, q, task], project.path);
    expect(buildProjectIndex([project, task])).toHaveLength(1);
    expect(filterWorkbenchItems(snapshot, 'needle-body-only', { fullText: false })).toMatchObject({ problems: [] });
    expect(filterWorkbenchItems(snapshot, 'needle-body-only', { fullText: true }).problems.map((p) => p.title)).toEqual(['Q']);
    expect(filterWorkbenchItems(snapshot, '', { includeArchived: false }).tasks).toEqual([]);
    expect(filterWorkbenchItems(snapshot, '', { includeArchived: true }).tasks.map((t) => t.title)).toEqual(['代表性 workload']);
    expect(filterWorkbenchItems(snapshot, '', { stage: ['evaluation'] }).problems.map((p) => p.title)).toEqual(['Q']);
  });
});
