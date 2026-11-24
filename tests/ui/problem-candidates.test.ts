import { describe, expect, it } from 'vitest';
import { getUnassociatedProblemCandidates } from '../../src/ui/problem-candidates';

describe('configured problem association', () => {
  it('finds candidates in a custom directory and excludes other scopes and linked problems', () => {
    const files = [
      { path: 'Work/Questions/First.md', content: '' },
      { path: 'Work/Questions/Linked.md', content: '' },
      { path: 'Work/QuestionsArchive/Outside.md', content: '' },
      { path: 'Work/Projects/Project.md', content: '' },
    ];
    expect(getUnassociatedProblemCandidates(files, new Set(['Work/Questions/Linked.md']), ['Work/Questions']))
      .toEqual([{ path: 'Work/Questions/First.md', title: 'First' }]);
  });

  it('does not return any candidates before directories are configured', () => {
    expect(getUnassociatedProblemCandidates([{ path: 'Questions/Q.md', content: '' }], new Set(), []))
      .toEqual([]);
  });
});
