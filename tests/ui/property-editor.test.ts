import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupDom, flushUi } from '../helpers/dom';
import { openPropertyEditor } from '../../src/ui/components/property-editor';
import { renderPropertyButton } from '../../src/ui/components/property-button';
afterEach(() => vi.unstubAllGlobals());

describe('inline property interactions', () => {
  it('edits only the clicked field and does not open the surrounding note', () => {
    const { root } = setupDom(); const openNote = vi.fn(); root.onclick = openNote;
    const edit = vi.fn(); const trigger = renderPropertyButton(root, { path: 'Problems/Q.md', field: 'stage', label: '研究阶段', value: 'evaluation', onEdit: edit });
    trigger.click();
    expect(edit).toHaveBeenCalledWith(trigger);
    expect(openNote).not.toHaveBeenCalled();
    expect(trigger.getAttribute('aria-label')).toContain('研究阶段');
  });
  it('saves a selected or custom value and restores focus to its trigger', async () => {
    const { root, browser } = setupDom(); const trigger = root.createEl('button'); const save = vi.fn(async () => {});
    openPropertyEditor(trigger, { label: '状态', mode: 'single', value: 'active', choices: ['active', 'exploring'], onSave: save });
    const input = document.querySelector('input')!; input.value = 'investigating';
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event);
    await flushUi();
    expect(save).toHaveBeenCalledWith('investigating');
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('keeps draft text visible after a rejected write and cancels without another write', async () => {
    const { root, browser } = setupDom(); const trigger = root.createEl('button'); const save = vi.fn(async () => { throw new Error('Changed externally'); });
    openPropertyEditor(trigger, { label: '状态', mode: 'single', value: 'active', choices: ['active'], onSave: save });
    const input = document.querySelector('input')!; input.value = 'custom';
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event); await flushUi();
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Changed externally');
    expect(input.value).toBe('custom');
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }) as unknown as Event);
    expect(document.querySelector('[role=dialog]')).toBeNull(); expect(save).toHaveBeenCalledTimes(1);
  });
  it('supports adding and clearing tags and explicit save', async () => {
    const { root, browser } = setupDom(); const save = vi.fn(async () => {});
    openPropertyEditor(root.createEl('button'), { label: '标签', mode: 'tags', value: ['research'], choices: [], onSave: save });
    (document.querySelector('[aria-label="移除标签 research"]') as HTMLElement).click();
    const input = document.querySelector('input')!; input.value = 'custom'; input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event);
    (document.querySelector('[data-action=save]') as HTMLElement).click(); await flushUi();
    expect(save).toHaveBeenCalledWith(['custom']);
  });
  it('cancels on an outside pointer and uses a modal presentation on narrow screens', () => {
    const { root, browser } = setupDom(390); const save = vi.fn(async () => {});
    openPropertyEditor(root.createEl('button'), { label: '当前门槛', mode: 'text', value: 'Gate', choices: [], onSave: save });
    expect(document.querySelector('[role=dialog]')?.getAttribute('aria-modal')).toBe('true');
    root.dispatchEvent(new browser.Event('pointerdown', { bubbles: true }) as unknown as Event);
    expect(document.querySelector('[role=dialog]')).toBeNull(); expect(save).not.toHaveBeenCalled();
  });
  it('selects the last suggestion when ArrowUp starts keyboard navigation', async () => {
    const { root, browser } = setupDom(); const save = vi.fn(async () => {});
    openPropertyEditor(root.createEl('button'), { label: '状态', mode: 'single', value: '', choices: ['active', 'exploring', 'investigating'], onSave: save });
    const input = document.querySelector('input')!;
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }) as unknown as Event);
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event); await flushUi();
    expect(save).toHaveBeenCalledWith('investigating');
  });
  it('keeps one editor and freezes controls until an in-flight save finishes', async () => {
    const { root, browser } = setupDom(); let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    openPropertyEditor(root.createEl('button'), { label: '状态', mode: 'single', value: 'active', choices: ['active'], onSave: () => pending });
    const input = document.querySelector('input')!;
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as Event);
    openPropertyEditor(root.createEl('button'), { label: '阶段', mode: 'single', value: 'analysis', choices: ['analysis'], onSave: async () => {} });
    expect(document.querySelectorAll('.rw-property-editor')).toHaveLength(1);
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.rw-property-editor button')).every((button) => button.disabled)).toBe(true);
    finish(); await flushUi(); expect(document.querySelector('.rw-property-editor')).toBeNull();
  });

});
