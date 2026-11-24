import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { getPropertySuggestions, saveInlineProperty } from '../../src/ui/property-model';
import { sha256 } from '../../src/ui/vault-writes';
import { memoryVault } from '../helpers/memory-vault';
const fields = (raw: string) => parse(raw.match(/^---\n([\s\S]*?)\n---/)![1]);

describe('inline property writes', () => {
  it('updates one custom field and preserves other properties and body', async () => {
    const raw = '---\ntype: problem\nstatus: active\nstage: analysis\ncustom: retained\n---\n# Body\n';
    const test = memoryVault({ 'Problems/Q.md': raw });
    await saveInlineProperty(test.app, 'Problems/Q.md', sha256(raw), 'stage', 'custom-stage');
    expect(fields(test.contents.get('Problems/Q.md')!)).toMatchObject({ type: 'problem', status: 'active', stage: 'custom-stage', custom: 'retained' });
    expect(test.contents.get('Problems/Q.md')).toContain('# Body\n');
  });
  it('accepts empty tags but rejects unsupported fields and blank scalar properties', async () => {
    const raw = '---\ntags: [research]\n---\n# Body';
    const test = memoryVault({ 'Problems/Q.md': raw });
    await expect(saveInlineProperty(test.app, 'Problems/Q.md', sha256(raw), 'type' as 'status', 'project')).rejects.toThrow();
    await expect(saveInlineProperty(test.app, 'Problems/Q.md', sha256(raw), 'status', '  ')).rejects.toThrow();
    await saveInlineProperty(test.app, 'Problems/Q.md', sha256(raw), 'tags', []);
    expect(fields(test.contents.get('Problems/Q.md')!).tags).toEqual([]);
  });
  it('preserves at least one nonempty goal and rejects stale snapshots', async () => {
    const raw = '---\ncurrent_gate: Gate\nnext_milestone: ""\n---\n# P';
    const test = memoryVault({ 'Projects/P.md': raw });
    await expect(saveInlineProperty(test.app, 'Projects/P.md', sha256(raw), 'current_gate', '')).rejects.toThrow();
    test.contents.set('Projects/P.md', raw+'\nExternal');
    await expect(saveInlineProperty(test.app, 'Projects/P.md', sha256(raw), 'status', 'active')).rejects.toThrow('冲突');
    expect(test.modify).not.toHaveBeenCalled();
  });
  it('derives custom suggestions from cached notes of the same entity type', () => {
    const files = [{ path: 'Problems/Q.md', content: '---\ntype: problem\nstatus: investigating\n---\n' }, { path: 'Projects/P.md', content: '---\ntype: project\nstatus: proposal-only\n---\n' }];
    expect(getPropertySuggestions(files, 'problem', 'status')).toContain('investigating');
    expect(getPropertySuggestions(files, 'problem', 'status')).not.toContain('proposal-only');
  });
});
