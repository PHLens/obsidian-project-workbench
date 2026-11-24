import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('yaml', async (importOriginal) => {
  const original = await importOriginal<typeof import('yaml')>();
  return { ...original, parse: vi.fn(original.parse) };
});
import { parse } from 'yaml';
import { parseNote, primeParsedNotes } from '../../src/model/frontmatter';
import { buildProjectIndex, buildProjectSnapshot } from '../../src/model/project-snapshot';
const file = (path: string, fields: string, body = '') => ({ path, content: `---\n${fields}\n---\n${body}`, mtime: 1 });
beforeEach(() => { vi.mocked(parse).mockClear(); });

describe('parsed note reuse', () => {
  it('does not parse unchanged YAML again across project indexes and snapshots', () => {
    const files = [file('Projects/P.md','type: project\nproblems: ["[[Q]]"]','# P'), file('Problems/Q.md','type: problem','# Q'), file('Records/2026-11-24.md','date: 2026-11-24','# Record\n\nP progress')];
    const scope = { projectDirectories: ['Projects'], problemDirectories: ['Problems'], recordDirectories: ['Records'] };
    buildProjectIndex(files, scope); buildProjectSnapshot(files, 'Projects/P.md', scope);
    vi.mocked(parse).mockClear();
    buildProjectIndex(files, scope); const snapshot = buildProjectSnapshot(files,'Projects/P.md',scope);
    expect(snapshot.problems).toHaveLength(1); expect(parse).not.toHaveBeenCalled();
  });
  it('reparses content changes but refreshes path/mtime without decoding identical YAML', () => {
    const source = file('Problems/Q.md','type: problem\nstatus: active','# Q');
    expect(parseNote(source).frontmatter.status).toBe('active'); vi.mocked(parse).mockClear();
    source.mtime = 2; source.path = 'Problems/Renamed.md';
    expect(parseNote(source)).toMatchObject({ path:'Problems/Renamed.md',mtime:2 }); expect(parse).not.toHaveBeenCalled();
    source.content = source.content.replace('status: active','status: completed');
    expect(parseNote(source).frontmatter.status).toBe('completed'); expect(parse).toHaveBeenCalledTimes(1);
  });
  it('does not decode irrelevant Markdown when configured project paths are known', () => {
    const files = [file('Projects/P.md','type: project','# P'),{ path:'Records/Broken.md',content:'---\ninvalid: [\n---\n# Outside',mtime:1 }];
    expect(() => buildProjectIndex(files,{projectDirectories:['Projects']})).not.toThrow();
    expect(parse).toHaveBeenCalledTimes(1);
  });
  it('yields during cold priming but performs no decode or yield for an unchanged cache', async () => {
    const files=Array.from({length:70},(_,index)=>file(`Notes/${index}.md`,'type: note','# Content'));
    const yieldControl=vi.fn(async()=>{});
    expect(await primeParsedNotes(files,()=>true,yieldControl)).toBe(true); expect(yieldControl.mock.calls.length).toBeGreaterThan(0);
    vi.mocked(parse).mockClear(); yieldControl.mockClear();
    expect(await primeParsedNotes(files,()=>true,yieldControl)).toBe(true); expect(parse).not.toHaveBeenCalled(); expect(yieldControl).not.toHaveBeenCalled();
  });
  it('stops cold priming when the view becomes unavailable at a yield boundary', async () => {
    const files=Array.from({length:70},(_,index)=>file(`Notes/${index}.md`,'type: note','# Content'));
    let active=true;
    expect(await primeParsedNotes(files,()=>active,async()=>{active=false;})).toBe(false);
    expect(vi.mocked(parse).mock.calls.length).toBeGreaterThan(0); expect(vi.mocked(parse).mock.calls.length).toBeLessThan(files.length);
  });

});
