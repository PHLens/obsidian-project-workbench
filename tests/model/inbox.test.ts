import { describe, expect, it } from 'vitest';
import { buildInboxIndex, filterInbox, inboxForProject, resolveAssociationPath } from '../../src/model/inbox';
import type { VaultFile } from '../../src/model/types';
const note = (path: string, fields: string, body = ''): VaultFile => ({ path, content: `---\n${fields}\n---\n${body}` });
const project = note('Projects/P.md', 'type: project');
const problem = note('Problems/Q.md', 'type: problem');

describe('global Inbox', () => {
  it('indexes an uncategorized title-only entry independently of projects', () => {
    const entries = buildInboxIndex([note('Inputs/Read.md', 'type: inbox\ntitle: Read this\ninput_kind: paper\nprocessing_status: pending')], { inputDirectories: ['Inputs'] });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ title: 'Read this', kind: 'paper', status: 'pending', projects: [], problems: [] });
  });
  it('preserves legacy associations, processed items, and explicit state precedence', () => {
    const entries = buildInboxIndex([
      note('Inputs/Old.md', 'type: idea\nproject: "[[Projects/P.md]]"\nprojects: ["[[Projects/Other.md]]"]\nproblems: "[[Problems/Q.md]]"\npending: true\nprocessing_status: linked'),
      note('Inputs/Custom.md', 'processing_status: custom-state'),
      note('Inputs/Future.md', 'pending: false\nprocessing_status: deferred'),
      note('Elsewhere/Skip.md', 'pending: true'),
    ], { inputDirectories: ['Inputs'] });
    expect(entries.map((entry) => entry.path)).toEqual(['Inputs/Custom.md', 'Inputs/Future.md', 'Inputs/Old.md']);
    const old = entries.find((entry) => entry.title === 'Old')!;
    expect(old.projects).toEqual(['[[Projects/P.md]]', '[[Projects/Other.md]]']);
    expect(old.problems).toEqual(['[[Problems/Q.md]]']);
    expect(filterInbox(entries, { view: 'pending' }, [])).toHaveLength(3);
    expect(filterInbox(entries, { view: 'processed' }, [])).toEqual([]);
    expect(filterInbox(entries, { view: 'all' }, [])).toHaveLength(3);
  });
  it('uses full paths and rejects ambiguous basenames', () => {
    const files = [{ path: 'Problems/A/Q.md' }, { path: 'Problems/B/Q.md' }];
    expect(resolveAssociationPath('[[Problems/B/Q.md]]', files)).toBe('Problems/B/Q.md');
    expect(resolveAssociationPath('[[Q]]', files)).toBeUndefined();
    expect(resolveAssociationPath('[[Missing]]', files)).toBeUndefined();
  });
  it('projects direct project links and problem links while retaining a global list', () => {
    const files = [project, problem,
      note('Inputs/Project.md', 'pending: true\nproject: "[[P]]"'),
      note('Inputs/Problem.md', 'pending: true\nproblems: ["[[Problems/Q.md]]"]'),
      note('Inputs/Loose.md', 'pending: true'),
    ];
    const entries = buildInboxIndex(files, { inputDirectories: ['Inputs'] });
    expect(entries).toHaveLength(3);
    expect(inboxForProject(entries, project.path, [problem.path], files).map((entry) => entry.title)).toEqual(['Problem', 'Project']);
    expect(filterInbox(entries, { view: 'pending', association: { kind: 'problem', path: problem.path } }, files).map((entry) => entry.title)).toEqual(['Problem']);
  });
  it('filters by kind and cached summary or source text', () => {
    const entries = buildInboxIndex([note('Inputs/Read.md', 'type: inbox\ninput_kind: paper\nsource: https://example.org/paper', '# Reading\n\nA useful precision study.')]);
    expect(filterInbox(entries, { view: 'all', query: 'precision', kind: 'paper' }, [])).toHaveLength(1);
    expect(filterInbox(entries, { view: 'all', query: 'example.org', kind: 'idea' }, [])).toHaveLength(0);
  });
});
