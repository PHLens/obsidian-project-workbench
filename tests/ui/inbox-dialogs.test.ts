import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { setupDom, flushUi } from '../helpers/dom';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { createAssociationPicker } from '../../src/ui/components/association-picker';
import { InboxAssociationsModal } from '../../src/ui/modals/inbox-associations-modal';
import { InboxCaptureModal } from '../../src/ui/modals/inbox-capture-modal';
afterEach(() => vi.unstubAllGlobals());
const candidates = { projects: [{ path: 'Projects/P.md', title: 'P' }], problems: [{ path: 'Problems/Q.md', title: 'Q' }], notes: [{ path: 'Library/Paper.md', title: 'Paper' }] };

describe('Inbox capture and association dialogs', () => {
  it('preserves unresolved links while selecting multiple known targets', () => {
    const { root } = setupDom();
    const picker = createAssociationPicker(root, { label: '研究问题', candidates: candidates.problems, selected: ['[[Missing]]'] });
    (root.querySelector('input[type=checkbox]') as HTMLElement).click();
    expect(picker.getValue()).toEqual(['[[Missing]]', '[[Problems/Q.md]]']);
    expect(root.querySelector('.is-unresolved')?.textContent).toContain('Missing');
  });
  it('submits a title-only entry with visible context defaults', async () => {
    setupDom(); const submit = vi.fn(async () => {});
    new InboxCaptureModal({} as App, { mode: 'new', kind: 'idea', context: { projectPath: 'Projects/P.md', problemPath: 'Problems/Q.md' }, candidates, submit }).open();
    (document.querySelector('[name=title]') as HTMLInputElement).value = 'Quick thought';
    (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi();
    expect(submit).toHaveBeenCalledWith({ title: 'Quick thought', kind: 'idea', content: '', sourceValue: '', projects: ['[[Projects/P.md]]'], problems: ['[[Problems/Q.md]]'] });
  });
  it('selects an existing note by metadata and submits a reference entry', async () => {
    setupDom(); const submit = vi.fn(async () => {});
    new InboxCaptureModal({} as App, { mode: 'reference', candidates, submit }).open();
    (document.querySelector('.rw-note-result') as HTMLElement).click();
    (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Paper', sourceValue: '[[Library/Paper.md]]', projects: [], problems: [] }));
  });
  it('keeps capture data when saving fails', async () => {
    setupDom(); const submit = vi.fn(async () => { throw new Error('Write failed'); });
    new InboxCaptureModal({} as App, { mode: 'new', candidates, submit }).open();
    (document.querySelector('[name=title]') as HTMLInputElement).value = 'Keep me';
    (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi();
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Write failed');
    expect((document.querySelector('[name=title]') as HTMLInputElement).value).toBe('Keep me');
  });
  it('restores keyboard focus after a selection and after chip removal', () => {
    const { root } = setupDom(); createAssociationPicker(root, { label: '问题', candidates: candidates.problems, selected: ['[[Missing]]'] });
    const checkbox = root.querySelector<HTMLInputElement>('input[type=checkbox]')!; checkbox.focus(); checkbox.click();
    expect(document.activeElement).toBe(root.querySelector('input[type=checkbox]'));
    const remove = root.querySelector<HTMLButtonElement>('.rw-association-chips button')!; remove.focus(); remove.click();
    expect(document.activeElement).not.toBe(document.body);
    expect(root.contains(document.activeElement)).toBe(true);
  });
  it('retains capture data if dismissal is attempted during a failing save', async () => {
    setupDom(); let fail: (reason: Error) => void = () => {};
    const pending = new Promise<void>((_, reject) => { fail = reject; });
    const modal = new InboxCaptureModal({} as App, { mode: 'new', candidates, submit: () => pending }); modal.open();
    (document.querySelector('[name=title]') as HTMLInputElement).value = 'Keep me'; (document.querySelector('[data-action=save]') as HTMLElement).click(); modal.close();
    expect(document.querySelector('.modal-content')).not.toBeNull();
    expect(document.querySelector<HTMLInputElement>('.modal-content input')?.disabled).toBe(true);
    fail(new Error('Save failed')); await flushUi();
    expect((document.querySelector('[name=title]') as HTMLInputElement).value).toBe('Keep me'); expect(document.querySelector('[role=alert]')?.textContent).toContain('Save failed'); modal.close();
  });
  it('retains association selections if dismissal is attempted during a failing save', async () => {
    setupDom(); let fail: (reason: Error) => void = () => {};
    const pending = new Promise<void>((_, reject) => { fail = reject; });
    const modal = new InboxAssociationsModal({} as App, { projects: [], problems: ['[[Missing]]'] }, candidates, () => pending); modal.open();
    (document.querySelector('[data-action=save]') as HTMLElement).click(); modal.close();
    expect(document.querySelector('.modal-content')).not.toBeNull();
    expect(document.querySelector<HTMLInputElement>('.modal-content input')?.disabled).toBe(true);
    fail(new Error('Save failed')); await flushUi(); expect(document.querySelector('.modal-content')?.textContent).toContain('Missing'); modal.close();
  });

});
