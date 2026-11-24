import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import { setupDom, flushUi } from '../helpers/dom';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { interactiveVault } from '../helpers/interactive-vault';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
import { renderInboxNotification } from '../../src/ui/components/inbox-notification';
const scope = { projectDirectories: ['Projects'], problemDirectories: ['Problems'], inputDirectories: ['Inputs'] };
const source = (title: string, state = 'pending', extra = '') => `---\ntype: inbox\ntitle: ${title}\nprocessing_status: ${state}\n${extra}\n---\n# ${title}`;
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Inbox attention indicators', () => {
  it('shows the real count accessibly and caps the visual badge at 99+', () => {
    const { root } = setupDom(); const open = vi.fn();
    const notification = renderInboxNotification(root, 128, open);
    expect(notification.querySelector('.rw-inbox-count')?.textContent).toBe('99+');
    expect(notification.getAttribute('aria-label')).toContain('128'); notification.click(); expect(open).toHaveBeenCalledTimes(1);
    expect(renderInboxNotification(root, 0, open).querySelector('.rw-inbox-count')).toBeNull();
  });
  it('keeps global counts when filters narrow the list and clicking the icon opens the real pending backlog', async () => {
    setupDom(); const test = interactiveVault({ 'Inputs/A.md': source('A'), 'Inputs/B.md': source('B'), 'Inputs/C.md': source('C','processed'), 'Inputs/Archived.md': source('Archived','pending','archived: true') });
    const view = new ResearchWorkbenchView({ app: test.app } as unknown as WorkspaceLeaf, scope); await view.onOpen();
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')?.textContent).toBe('2');
    expect(document.querySelector('.rw-sidebar [data-panel=inbox] .rw-inbox-count')?.textContent).toBe('2');
    (document.querySelector('.rw-inbox-notification') as HTMLElement).click();
    const search = document.querySelector<HTMLInputElement>('.rw-search')!; search.value = 'no match'; search.dispatchEvent(new window.Event('input',{bubbles:true})); await new Promise((resolve)=>setTimeout(resolve,60));
    expect(document.querySelectorAll('.rw-inbox-entry')).toHaveLength(0);
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')?.textContent).toBe('2');
    (document.querySelector('.rw-inbox-notification') as HTMLElement).click();
    expect(document.querySelectorAll('.rw-inbox-entry')).toHaveLength(2);
    expect(document.querySelector<HTMLInputElement>('.rw-search')?.value).toBe('');
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')?.textContent).toBe('2'); view.onunload();
  });
  it('updates badges after explicit processing and restores them when value needs review again', async () => {
    const { browser } = setupDom(); const test = interactiveVault({ 'Inputs/A.md': source('A') });
    const view = new ResearchWorkbenchView({ app:test.app } as unknown as WorkspaceLeaf,scope); await view.onOpen();
    (document.querySelector('.rw-inbox-notification') as HTMLElement).click();
    const state = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 A"]')!; state.value='processed'; state.dispatchEvent(new browser.Event('change',{bubbles:true}) as unknown as Event); await flushUi(); await flushUi();
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')).toBeNull();
    (document.querySelector('[data-inbox-view=processed]') as HTMLElement).click();
    const back = document.querySelector<HTMLSelectElement>('[aria-label="处理状态 A"]')!; back.value='pending'; back.dispatchEvent(new browser.Event('change',{bubbles:true}) as unknown as Event); await flushUi(); await flushUi();
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')?.textContent).toBe('1'); view.onunload();
  });
  it('shows scoped panel counts while retaining the global reminder', async () => {
    setupDom(); const test = interactiveVault({ 'Projects/P.md': '---\ntype: project\n---\n# P', 'Inputs/A.md': source('A','pending','projects: ["[[Projects/P.md]]"]'), 'Inputs/B.md':source('B'), 'Inputs/C.md':source('C','processed','projects: ["[[Projects/P.md]]"]') });
    const view = new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope); await view.onOpen();
    (document.querySelector('.rw-inbox-card .rw-link-button:last-child') as HTMLElement).click();
    expect(document.querySelector('[data-inbox-view=pending] .rw-inbox-tab-count')?.textContent).toBe('1');
    expect(document.querySelector('[data-inbox-view=processed] .rw-inbox-tab-count')?.textContent).toBe('1');
    expect(document.querySelector('.rw-inbox-notification .rw-inbox-count')?.textContent).toBe('2'); view.onunload();
  });
});
