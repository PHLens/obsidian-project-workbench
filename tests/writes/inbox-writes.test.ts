import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createInboxEntry, updateInboxAssociations, changeInboxState } from '../../src/ui/inbox-writes';
import { sha256 } from '../../src/ui/vault-writes';
import { memoryVault } from '../helpers/memory-vault';
const fields = (raw: string) => parse(raw.match(/^---\n([\s\S]*?)\n---/)![1]);
const input = { title: 'Read this', kind: 'paper' as const, content: '', sourceValue: '', projects: [], problems: [] };

describe('protected Inbox writes', () => {
  it('creates title-only entries, avoids collisions, and leaves referenced notes untouched', async () => {
    const original = '# Original source\n\nPreserve this.';
    const test = memoryVault({ 'Library/Source.md': original, 'Inputs/Read this.md': '# Existing' });
    const path = await createInboxEntry(test.app, { ...input, sourceValue: '[[Library/Source.md]]' }, 'Inputs');
    expect(path).toBe('Inputs/Read this (2).md');
    expect(fields(test.contents.get(path)!)).toMatchObject({ type: 'inbox', title: 'Read this', input_kind: 'paper', processing_status: 'pending', projects: [], problems: [], source: '[[Library/Source.md]]' });
    expect(test.contents.get('Library/Source.md')).toBe(original);
    expect(test.modify).not.toHaveBeenCalled();
  });
  it('rejects empty or missing directories without creating fallback files', async () => {
    const test = memoryVault({});
    await expect(createInboxEntry(test.app, input, '')).rejects.toThrow();
    await expect(createInboxEntry(test.app, input, 'Missing')).rejects.toThrow();
    expect(test.create).not.toHaveBeenCalled();
  });
  it('replaces legacy singular project links without changing processing state or body', async () => {
    const raw = '---\nproject: "[[Old]]"\npending: true\nprocessing_status: pending\ncustom: retained\n---\n# Body\n';
    const test = memoryVault({ 'Inputs/I.md': raw });
    await updateInboxAssociations(test.app, 'Inputs/I.md', sha256(raw), { projects: ['Projects/New.md'], problems: ['[[Missing]]', 'Problems/Q.md'] });
    expect(fields(test.contents.get('Inputs/I.md')!)).toMatchObject({ pending: true, processing_status: 'pending', custom: 'retained', projects: ['[[Projects/New.md]]'], problems: ['[[Missing]]', '[[Problems/Q.md]]'] });
    expect(fields(test.contents.get('Inputs/I.md')!).project).toBeUndefined();
    expect(test.contents.get('Inputs/I.md')).toContain('# Body\n');
  });
  it('requires a real association before marking linked', async () => {
    const raw = '---\npending: true\nproblems: ["[[Missing]]"]\n---\n# Body';
    const test = memoryVault({ 'Inputs/I.md': raw });
    await expect(changeInboxState(test.app, 'Inputs/I.md', sha256(raw), 'linked', [{ path: 'Problems/Q.md' }])).rejects.toThrow();
    expect(test.modify).not.toHaveBeenCalled();
  });
  it('keeps processed entries while clearing the pending flag', async () => {
    const raw = '---\npending: true\nproblems: ["[[Problems/Q.md]]"]\n---\n# Body';
    const test = memoryVault({ 'Inputs/I.md': raw });
    await changeInboxState(test.app, 'Inputs/I.md', sha256(raw), 'linked', [{ path: 'Problems/Q.md' }]);
    expect(fields(test.contents.get('Inputs/I.md')!)).toMatchObject({ pending: false, processing_status: 'linked' });
  });
  it('rejects association writes from an outdated editor', async () => {
    const test = memoryVault({ 'Inputs/I.md': '# Changed externally' });
    await expect(updateInboxAssociations(test.app, 'Inputs/I.md', sha256('# Original'), { projects: [], problems: [] })).rejects.toThrow('冲突');
    expect(test.modify).not.toHaveBeenCalled();
  });
  it('associates and marks linked atomically when completing processing', async () => {
    const raw = '---\npending: true\nprocessing_status: pending\n---\n# Body';
    const test = memoryVault({ 'Inputs/I.md': raw });
    await updateInboxAssociations(test.app, 'Inputs/I.md', sha256(raw), { projects: [], problems: ['Problems/Q.md'] }, { status: 'linked', validTargets: [{ path: 'Problems/Q.md' }] });
    expect(fields(test.contents.get('Inputs/I.md')!)).toMatchObject({ pending: false, processing_status: 'linked', problems: ['[[Problems/Q.md]]'] });
    expect(test.modify).toHaveBeenCalledTimes(1);
  });

});
