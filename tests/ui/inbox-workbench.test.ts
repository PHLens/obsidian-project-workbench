import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import { parse } from 'yaml';
import { setupDom, flushUi } from '../helpers/dom';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { interactiveVault } from '../helpers/interactive-vault';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
const scope = { projectDirectories: ['Projects'], problemDirectories: ['Problems'], inputDirectories: ['Inputs'] };
const project = '---\ntype: project\ntitle: Demo\nproblems: ["[[Problems/Q.md]]"]\ncurrent_gate: First gate\n---\n# Demo\n\nGoal';
const problem = '---\ntype: problem\nstatus: active\nstage: analysis\nresearch_role: mainline\ntags: [research]\n---\n# Q';
const button = (text: string, root: ParentNode = document): HTMLButtonElement | undefined => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === text);
const fields = (raw: string) => parse(raw.match(/^---\n([\s\S]*?)\n---/)![1]);
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('complete Inbox workbench flows', () => {
  it('captures uncategorized material with no project and preserves the shared header', async () => {
    setupDom(); const test = interactiveVault({}); const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope);
    await view.onOpen();
    const inbox = button('收件箱'); expect(inbox).toBeDefined(); inbox!.click();
    expect(document.querySelector('.rw-topbar')).not.toBeNull();
    const add = button('＋ 新增资料', document.querySelector('.rw-inbox-panel')!); expect(add).toBeDefined(); add!.click();
    (document.querySelector('[name=title]') as HTMLInputElement).value = 'Loose thought';
    (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi(); await flushUi();
    const path = 'Inputs/Loose thought.md'; expect(test.contents.has(path)).toBe(true);
    expect(fields(test.contents.get(path)!)).toMatchObject({ projects: [], problems: [], pending: true });
    expect(document.querySelector('.rw-inbox-panel')?.textContent).toContain('Loose thought'); view.onunload();
  });
  it('opens contextual capture for a problem while keeping global capture unassigned', async () => {
    setupDom(); const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem }); const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen();
    const add = document.querySelector<HTMLButtonElement>('.rw-problem-row [data-action=add-material]'); expect(add).not.toBeNull(); add!.click();
    expect(document.querySelector('.modal-content')?.textContent).toContain('Problems/Q.md');
    (document.querySelector('[name=title]') as HTMLInputElement).value = 'Material'; (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi(); await flushUi();
    expect(fields(test.contents.get('Inputs/Material.md')!)).toMatchObject({ projects: ['[[Projects/Demo.md]]'], problems: ['[[Problems/Q.md]]'] });
    button('收件箱')!.click(); button('＋ 新增资料', document.querySelector('.rw-inbox-panel')!)!.click();
    expect(document.querySelector('.modal-content .rw-association-chips')?.textContent).toBe(''); view.onunload();
  });
  it('saves a single clicked problem property without opening its note or rereading unrelated notes', async () => {
    const { browser } = setupDom(); const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem, 'Inputs/Other.md': '---\npending: true\n---\n# Other' });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); test.read.mockClear();
    const edit = document.querySelector<HTMLButtonElement>('.rw-problem-row [data-field=stage]'); expect(edit).not.toBeNull(); edit!.click(); await flushUi();
    const input = document.querySelector<HTMLInputElement>('.rw-property-editor input')!; expect(input).not.toBeNull(); input.value = 'custom-phase'; input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event); await flushUi(); await flushUi();
    expect(fields(test.contents.get('Problems/Q.md')!)).toMatchObject({ status: 'active', stage: 'custom-phase', tags: ['research'] });
    expect(test.openFile).not.toHaveBeenCalled(); expect(test.read.mock.calls.every(([file]) => file.path === 'Problems/Q.md')).toBe(true); view.onunload();
  });
  it('keeps processed material discoverable after a state change', async () => {
    const { browser } = setupDom(); const raw = '---\ntype: inbox\ntitle: Reading\nprocessing_status: pending\npending: true\nprojects: ["[[Projects/Demo.md]]"]\n---\n# Reading';
    const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem, 'Inputs/Reading.md': raw }); const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    const status = document.querySelector<HTMLSelectElement>('.rw-inbox-panel [aria-label="处理状态 Reading"]'); expect(status).not.toBeNull(); status!.value = 'linked'; status!.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Event); await flushUi(); await flushUi();
    expect(document.querySelector('.rw-inbox-entry')).toBeNull(); button('已处理')!.click();
    expect(document.querySelector('.rw-inbox-entry')?.textContent).toContain('Reading'); view.onunload();
  });
  it('keeps custom input and external content intact when an inline editor becomes stale', async () => {
    const { browser } = setupDom(); const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen();
    document.querySelector<HTMLButtonElement>('.rw-problem-row [data-field=status]')!.click(); await flushUi();
    const input = document.querySelector<HTMLInputElement>('.rw-property-editor input')!; input.value = 'custom-state';
    test.contents.set('Problems/Q.md', problem+'\nExternal edit');
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event); await flushUi();
    expect(document.querySelector('.rw-property-editor [role=alert]')?.textContent).toContain('冲突');
    expect(input.value).toBe('custom-state'); expect(test.contents.get('Problems/Q.md')).toContain('External edit'); expect(test.modify).not.toHaveBeenCalled(); view.onunload();
  });
  it('adds multiple problem associations without processing the entry', async () => {
    setupDom(); const raw = '---\ntype: inbox\ntitle: Material\nprocessing_status: pending\npending: true\n---\n# Material';
    const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem, 'Problems/R.md': problem, 'Inputs/Material.md': raw });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    button('关联项目 / 问题')!.click(); await flushUi();
    const pickers = document.querySelectorAll('.modal-content .rw-association-picker');
    for (let index = 0; index < 2; index++) pickers[1].querySelectorAll<HTMLInputElement>('input[type=checkbox]')[index].click();
    (document.querySelector('.modal-content [data-action=save]') as HTMLElement).click(); await flushUi(); await flushUi();
    expect(fields(test.contents.get('Inputs/Material.md')!)).toMatchObject({ projects: [], problems: ['[[Problems/Q.md]]', '[[Problems/R.md]]'], pending: true, processing_status: 'pending' }); view.onunload();
  });
  it('restores the unchanged processing state if association selection is cancelled', async () => {
    const { browser } = setupDom(); const raw = '---\ntype: inbox\ntitle: Loose\nprocessing_status: pending\npending: true\n---\n# Loose';
    const test = interactiveVault({ 'Inputs/Loose.md': raw }); const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    const state = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 Loose"]')!; state.value = 'linked'; state.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Event); await flushUi();
    button('取消', document.querySelector('.modal-content')!)!.click();
    expect(document.querySelector<HTMLSelectElement>('[aria-label="处理状态 Loose"]')?.value).toBe('pending'); expect(test.modify).not.toHaveBeenCalled(); view.onunload();
  });

  it('edits project status and a multiline goal directly and keeps capture on every panel', async () => {
    const { browser } = setupDom(); const test = interactiveVault({ 'Projects/Demo.md': project, 'Problems/Q.md': problem });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen();
    document.querySelector<HTMLButtonElement>('.rw-project-header [data-field=status]')!.click(); await flushUi();
    const status = document.querySelector<HTMLInputElement>('.rw-property-editor input')!; status.value = 'active'; status.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event); await flushUi(); await flushUi();
    document.querySelector<HTMLButtonElement>('.rw-project-header [data-field=current_gate]')!.click(); await flushUi();
    const goal = document.querySelector<HTMLTextAreaElement>('.rw-property-editor textarea')!; goal.value = 'Updated gate\nCheck the result';
    (document.querySelector('.rw-property-editor [data-action=save]') as HTMLElement).click(); await flushUi(); await flushUi();
    expect(fields(test.contents.get('Projects/Demo.md')!)).toMatchObject({ status: 'active', current_gate: 'Updated gate\nCheck the result' });
    for (const label of ['阶段目标', '进展记录', '项目笔记']) {
      button(label, document.querySelector('.rw-sidebar')!)!.click();
      expect(button('＋ 新增资料', document.querySelector('.rw-topbar')!)).toBeDefined();
    }
    expect(test.openFile).not.toHaveBeenCalled(); view.onunload();
  });
  it('captures a source reference without reading or modifying the source note', async () => {
    setupDom(); const original = '# Paper\n\nOriginal content'; const test = interactiveVault({ 'Library/Paper.md': original });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); test.read.mockClear();
    button('引用笔记', document.querySelector('.rw-topbar')!)!.click();
    (document.querySelector('.rw-note-result') as HTMLElement).click(); (document.querySelector('.modal-content [data-action=save]') as HTMLElement).click(); await flushUi(); await flushUi();
    expect(fields(test.contents.get('Inputs/Paper.md')!)).toMatchObject({ source: '[[Library/Paper.md]]', projects: [], problems: [] });
    expect(test.contents.get('Library/Paper.md')).toBe(original);
    expect(test.read.mock.calls.some(([file]) => file.path === 'Library/Paper.md')).toBe(false); view.onunload();
  });

  it('revalidates selected targets when the association dialog is saved', async () => {
    const { browser } = setupDom(); const raw = '---\ntype: inbox\ntitle: Loose\nprocessing_status: pending\npending: true\n---\n# Loose';
    const test = interactiveVault({ 'Projects/Demo.md': project, 'Inputs/Loose.md': raw });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    const state = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 Loose"]')!; state.value = 'linked'; state.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Event); await flushUi();
    document.querySelector<HTMLInputElement>('.modal-content input[type=checkbox]')!.click();
    test.files.delete('Projects/Demo.md'); test.contents.delete('Projects/Demo.md'); await view.refresh();
    (document.querySelector('.modal-content [data-action=save]') as HTMLElement).click(); await flushUi();
    expect(fields(test.contents.get('Inputs/Loose.md')!)).toMatchObject({ processing_status: 'pending', pending: true });
    expect(test.modify).not.toHaveBeenCalled(); expect(document.querySelector('.modal-content [role=alert]')?.textContent).toContain('有效'); view.onunload();
  });
  it('does not mark linked from stale cached targets before a deletion event is processed', async () => {
    const { browser } = setupDom(); const raw = '---\ntype: inbox\ntitle: Reading\nprocessing_status: pending\nprojects: ["[[Projects/Demo.md]]"]\n---\n# Reading';
    const test = interactiveVault({ 'Projects/Demo.md': project, 'Inputs/Reading.md': raw });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    test.files.delete('Projects/Demo.md'); test.contents.delete('Projects/Demo.md');
    const state = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 Reading"]')!; state.value = 'linked'; state.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Event); await flushUi();
    expect(fields(test.contents.get('Inputs/Reading.md')!).processing_status).toBe('pending'); expect(test.modify).not.toHaveBeenCalled(); view.onunload();
  });

  it('checks target existence again inside the atomic state-change callback', async () => {
    const { browser } = setupDom(); const raw = '---\ntype: inbox\ntitle: Reading\nprocessing_status: pending\nprojects: ["[[Projects/Demo.md]]"]\n---\n# Reading';
    const test = interactiveVault({ 'Projects/Demo.md': project, 'Inputs/Reading.md': raw });
    const process = test.app.vault.process.bind(test.app.vault);
    test.app.vault.process = async (file, transform) => { test.files.delete('Projects/Demo.md'); test.contents.delete('Projects/Demo.md'); return process(file, transform); };
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen(); button('收件箱')!.click();
    const state = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 Reading"]')!; state.value = 'linked'; state.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Event); await flushUi();
    expect(fields(test.contents.get('Inputs/Reading.md')!).processing_status).toBe('pending'); expect(test.modify).not.toHaveBeenCalled(); view.onunload();
  });

});
