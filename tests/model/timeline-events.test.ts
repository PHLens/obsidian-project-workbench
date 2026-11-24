import { describe, expect, it } from 'vitest';
import { buildProjectSnapshot, buildTimelineEvents } from '../../src/model/project-snapshot';
import type { VaultFile } from '../../src/model/types';

const file = (path: string, content: string, mtime?: number): VaultFile => ({ path, content, mtime });

describe('timeline events', () => {
  it('prefers explicitly linked research records over file mtime fallback', () => {
    const project = file('Projects/P.md', `---
type: project
title: P
problems: ["[[Q]]"]
---
# P`, 1700000000000);
    const q = file('Problems/Q.md', `---
type: problem
status: exploring
---
# Q`, 1800000000000);
    const record = file('Records/2026-11-22.md', `## Research\n\n### P progress\n\nP moved forward.`, 1600000000000);
    const snapshot = buildProjectSnapshot([project, q, record], project.path);
    const events = buildTimelineEvents([project, q, record], snapshot);
    expect(events[0]).toMatchObject({ kind: 'record', path: record.path, date: '2026-11-22' });
    expect(events.some((event) => event.kind === 'file-update')).toBe(false);
  });

  it('uses a labeled file-update fallback when no research record exists', () => {
    const project = file('Projects/P.md', `---
type: project
title: P
---
# P`, 1700000000000);
    const snapshot = buildProjectSnapshot([project], project.path);
    const events = buildTimelineEvents([project], snapshot);
    expect(events[0]).toMatchObject({ kind: 'file-update', path: project.path, label: '文件更新' });
  });
});
