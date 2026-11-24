import { describe, expect, it } from 'vitest';
import { buildInboxIndex, filterInbox, getInboxCounts } from '../../src/model/inbox';
import { changeInboxState } from '../../src/ui/inbox-writes';
import { sha256 } from '../../src/ui/vault-writes';
import { memoryVault } from '../helpers/memory-vault';
import { parse } from 'yaml';
const note = (path: string, value: string) => ({ path, content: `---\ntype: inbox\n${value}\n---\n# Source\n\nKeep this source.` });

describe('Inbox value review', () => {
  it('treats only explicitly processed material as confirmed and organized', () => {
    const files = [note('Inputs/Confirmed.md', 'processing_status: processed\npending: false'), ...['linked','reference','deferred','custom-state'].map((status) => note(`Inputs/${status}.md`, `processing_status: ${status}\npending: false`))];
    const original = files.map((file) => file.content);
    const entries = buildInboxIndex(files);
    expect(filterInbox(entries, { view: 'processed' }, []).map((entry) => entry.path)).toEqual(['Inputs/Confirmed.md']);
    expect(filterInbox(entries, { view: 'pending' }, [])).toHaveLength(4);
    expect(files.map((file) => file.content)).toEqual(original);
  });
  it('counts pending value reviews independently of associations and excludes archived material', () => {
    const entries = buildInboxIndex([note('Inputs/A.md','processing_status: pending\nprojects: ["[[Projects/P.md]]"]'), note('Inputs/B.md','processing_status: pending'), note('Inputs/C.md','processing_status: processed'), note('Inputs/D.md','processing_status: pending\narchived: true')], { includeArchived: true });
    expect(getInboxCounts(entries)).toEqual({ pending: 2, processed: 1, total: 3 });
  });
  it('allows explicit completion without associations while preserving the source and body', async () => {
    const raw = note('Inputs/A.md','processing_status: pending\nsource: https://example.org/paper\nprojects: []\nproblems: []').content;
    const test = memoryVault({ 'Inputs/A.md': raw });
    await changeInboxState(test.app, 'Inputs/A.md', sha256(raw), 'processed');
    const saved = test.contents.get('Inputs/A.md')!;
    expect(parse(saved.match(/^---\n([\s\S]*?)\n---/)![1])).toMatchObject({ pending: false, processing_status: 'processed', source: 'https://example.org/paper', projects: [], problems: [] });
    expect(saved).toContain('# Source\n\nKeep this source.');
  });
  it('rejects association-oriented labels as new processing-state writes', async () => {
    const raw = note('Inputs/A.md','processing_status: pending').content;
    const test = memoryVault({ 'Inputs/A.md': raw });
    await expect(changeInboxState(test.app, 'Inputs/A.md', sha256(raw), 'linked' as 'processed')).rejects.toThrow();
    expect(test.modify).not.toHaveBeenCalled();
  });
});
