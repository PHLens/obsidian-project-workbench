import { describe, expect, it } from 'vitest';
import { resolveProblemScope, type Note } from '../../src/model/types';

describe('problem scope', () => {
  it('follows descendants and stops on cycles', () => {
    const notes: Note[] = [
      { path: 'Demo Project.md', content: '', frontmatter: { type: 'project', problems: ['[[P1]]'] } },
      { path: 'P1.md', content: '', frontmatter: { type: 'problem', up: '[[Demo Project]]' } },
      { path: 'P2.md', content: '', frontmatter: { type: 'problem', up: '[[P1]]' } },
      { path: 'P3.md', content: '', frontmatter: { type: 'problem', up: '[[P2]]' } },
      { path: 'P4.md', content: '', frontmatter: { type: 'problem', up: '[[P3]]' } },
    ];
    expect([...resolveProblemScope(notes[0], notes)]).toEqual(['P1.md', 'P2.md', 'P3.md', 'P4.md']);
  });
});
