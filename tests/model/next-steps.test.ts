import { describe, expect, it } from 'vitest';
import { buildProjectSnapshot, filterWorkbenchItems } from '../../src/model/project-snapshot';
import { searchWorkbench } from '../../src/ui/search/workbench-search';
import { parseNote } from '../../src/model/frontmatter';
import { readNextSteps } from '../../src/model/next-steps';

const project = { path: 'Projects/P.md', content: '---\ntype: project\nproblems: ["[[Problems/Q.md]]"]\n---\n# P' };
function snapshot(body: string) {
  return buildProjectSnapshot([project, { path: 'Problems/Q.md', content: '---\ntype: problem\n---\n' + body }], project.path);
}
describe('Next Step source previews', () => {
  it('reuses derived previews for unchanged cached notes and rebuilds them after a content change', () => {
    const file = { path: 'Problems/Q.md', content: '# Q\n\n## Next Step\n\n- [ ] Original' };
    const first = readNextSteps(parseNote(file));
    expect(readNextSteps(parseNote(file))).toBe(first);
    file.content = '# Q\n\n## Next Step\n\n- [ ] Updated';
    const updated = readNextSteps(parseNote(file));
    expect(updated).not.toBe(first); expect(updated.items.map(item => item.text)).toEqual(['Updated']);
  });
  it('extracts every checklist entry with source order, completion, and absolute lines', () => {
    const s = snapshot('# Q\n\n## Overview\n\nA useful question.\n\n## Next Step\n\n- [ ] First action\n- [x] Second action\n- [ ] Third action\n\n## Records\n\n- [ ] Other work');
    const p = s.problems[0];
    expect(p.nextSteps).toEqual(['First action', 'Second action', 'Third action']);
    expect(p.nextStepItems).toEqual([
      { text: 'First action', completed: false, depth: 0, line: 11 },
      { text: 'Second action', completed: true, depth: 0, line: 12 },
      { text: 'Third action', completed: false, depth: 0, line: 13 },
    ]);
    expect(p.nextStepHeading).toEqual({ text: 'Next Step', line: 9 });
    expect(p.summary).toBe('A useful question.');
  });
  it('keeps ordinary, numbered, nested, and continued items while ignoring fenced examples', () => {
    const p = snapshot('# Q\n\n~~~md\n## Next Step\n- [ ] Fake section\n~~~\n\n## next steps\n\n- Parent action\n  continued explanation\n  * [X] Child action\n1. Numbered action\n~~~md\n- [ ] Fake action\n## Fake boundary\n~~~\n+ Final action\n\n# Later\n- [ ] Excluded').problems[0];
    expect(p.nextSteps).toEqual(['Parent action continued explanation', 'Child action', 'Numbered action', 'Final action']);
    expect(p.nextStepItems?.map(({ text, completed, depth }) => ({ text, completed, depth }))).toEqual([
      { text: 'Parent action continued explanation', completed: undefined, depth: 0 },
      { text: 'Child action', completed: true, depth: 1 },
      { text: 'Numbered action', completed: undefined, depth: 0 },
      { text: 'Final action', completed: undefined, depth: 0 },
    ]);
  });
  it.each(['## 下一步', '## NEXT STEP', '## Next Steps'])('supports %s with CRLF and no following section', heading => {
    const p = snapshot(('# Q\n\n' + heading + '\n\n* [ ] One\n+ [x] Two').replaceAll('\n', '\r\n')).problems[0];
    expect(p.nextSteps).toEqual(['One', 'Two']);
    expect(p.nextStepHeading).toEqual({ text: heading.slice(3), line: 5 });
  });
  it('does not fabricate tasks or duplicate an action as an absent overview', () => {
    const p = snapshot('# Q\n\n## Next Step\n\nDiscuss the following idea.\n\n- [ ] An action').problems[0];
    expect(p.summary).toBeUndefined();
    expect(p.nextSteps).toEqual(['An action']);
    expect(snapshot('# Q\n\n## Next Step\n\nA paragraph only.').problems[0].nextSteps).toEqual([]);
    expect(snapshot('# Q\n\nAn introductory question.').problems[0].summary).toBe('An introductory question.');
  });
  it('searches later actions independently of overview and keeps other body text opt-in', () => {
    const s = snapshot('# Q\n\n## Overview\n\nA useful question.\n\n## Next Step\n\n- [ ] First action\n- [ ] Distinctive experiment\n\n## Analysis\n\nHidden reasoning');
    expect(filterWorkbenchItems(s, 'Distinctive experiment').problems.map(p => p.path)).toEqual(['Problems/Q.md']);
    expect(searchWorkbench(s, 'Distinctive experiment').map(p => p.path)).toEqual(['Problems/Q.md']);
    expect(filterWorkbenchItems(s, 'Hidden reasoning').problems).toEqual([]);
    expect(searchWorkbench(s, 'Hidden reasoning')).toEqual([]);
    expect(filterWorkbenchItems(s, 'Hidden reasoning', { fullText: true }).problems).toHaveLength(1);
  });
});
