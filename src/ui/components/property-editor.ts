import type { PropertyValue } from '../property-model';
interface EditorOptions { label: string; mode: 'single' | 'tags' | 'text'; value: PropertyValue; choices: string[]; onSave: (value: PropertyValue) => Promise<void>; }
const activeEditors = new WeakMap<Document, () => void>();
export function openPropertyEditor(anchor: HTMLElement, options: EditorOptions): () => void {
  const doc = anchor.ownerDocument; const viewport = doc.defaultView!;
  activeEditors.get(doc)?.();
  if (activeEditors.has(doc)) return activeEditors.get(doc)!;
  const root = doc.body.createDiv({ cls: `rw-property-editor ${viewport.innerWidth < 700 ? 'is-mobile' : ''}` });
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `编辑${options.label}`);
  if (viewport.innerWidth < 700) root.setAttribute('aria-modal', 'true');
  const rect = anchor.getBoundingClientRect();
  if (viewport.innerWidth >= 700) { root.style.left = `${Math.max(8, Math.min(rect.left, viewport.innerWidth - 340))}px`; root.style.top = `${Math.max(8, Math.min(rect.bottom + 6, viewport.innerHeight - 370))}px`; }
  root.createEl('strong', { cls: 'rw-form-label', text: options.label });
  root.createEl('small', { cls: 'rw-form-description', text: options.mode === 'single' ? '选择已有值，或输入新值后按 Enter 保存。' : options.mode === 'tags' ? '输入新标签后按 Enter 添加，再保存。' : '编辑后保存；Ctrl/⌘ + Enter 保存。' });
  let tags = Array.isArray(options.value) ? [...options.value] : [];
  const chips = root.createDiv({ cls: 'rw-association-chips' });
  const input = options.mode === 'text' ? root.createEl('textarea', { cls: 'rw-modal-textarea' }) : root.createEl('input', { cls: 'rw-modal-control', type: 'text' });
  input.setAttribute('aria-label', options.label); input.value = typeof options.value === 'string' ? options.value : '';
  const list = root.createDiv({ cls: 'rw-property-options' }); list.setAttribute('role', 'listbox');
  const error = root.createDiv({ cls: 'rw-form-error' }); error.setAttribute('role', 'alert');
  const actions = root.createDiv({ cls: 'rw-editor-actions' });
  const cancel = actions.createEl('button', { text: '取消' });
  const save = actions.createEl('button', { text: '保存', cls: 'mod-cta' }); save.dataset.action = 'save';
  let saving = false; let closed = false; let highlighted = -1;
  const close = () => {
    if (closed || saving) return;
    closed = true; root.remove(); doc.removeEventListener('pointerdown', outside, true); doc.removeEventListener('keydown', keydown);
    if (activeEditors.get(doc) === close) activeEditors.delete(doc);
    const focus = anchor.isConnected ? anchor : anchor.id ? doc.getElementById(anchor.id) : null; focus?.focus();
  };
  const commit = async (value: PropertyValue) => {
    if (saving || closed) return;
    saving = true; error.setText(''); root.setAttribute('aria-busy', 'true');
    root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = true; }); input.disabled = true;
    try { await options.onSave(value); saving = false; close(); }
    catch (reason) { saving = false; root.removeAttribute('aria-busy'); error.setText(reason instanceof Error ? reason.message : String(reason)); root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = false; }); input.disabled = false; input.focus(); }
  };
  const addTag = (value: string) => { const tag = value.trim().replace(/^#/, ''); if (tag && !tags.includes(tag)) tags.push(tag); input.value = ''; render(); input.focus(); };
  const render = () => {
    chips.empty(); list.empty(); highlighted = -1;
    if (options.mode === 'tags') for (const tag of tags) {
      const chip = chips.createSpan({ cls: 'rw-source-tag', text: tag });
      const remove = chip.createEl('button', { text: '×', attr: { 'aria-label': `移除标签 ${tag}` } });
      remove.onclick = () => { tags = tags.filter((item) => item !== tag); render(); };
    }
    if (options.mode !== 'text') {
      const query = input.value.trim().toLocaleLowerCase();
      const choices = [...new Set([...(typeof options.value === 'string' && options.value ? [options.value] : []), ...options.choices])];
      for (const choice of choices.filter((item) => item.toLocaleLowerCase().includes(query) && (options.mode !== 'tags' || !tags.includes(item))).slice(0, 30)) {
        const button = list.createEl('button', { cls: 'rw-property-option', text: choice, attr: { role: 'option', 'aria-selected': 'false' } });
        button.type = 'button'; button.onclick = () => options.mode === 'tags' ? addTag(choice) : void commit(choice);
      }
    }
  };
  const outside = (event: Event) => {
    const target = event.target as Element | null;
    if (target?.closest?.('[data-column-toggle],[data-column-close],[data-column-resize]') && anchor.closest('.research-workbench')?.contains(target)) return;
    if (!root.contains(event.target as Node)) close();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (!root.contains(event.target as Node)) return;
    if (event.key === 'Tab') {
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('input,textarea,button')).filter((element) => !(element as HTMLButtonElement).disabled);
      const index = focusable.indexOf(doc.activeElement as HTMLElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.mode !== 'text') {
      event.preventDefault(); const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
      highlighted = !buttons.length ? -1 : highlighted < 0 ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1) : (highlighted + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons.forEach((button, index) => button.setAttribute('aria-selected', String(index === highlighted))); return;
    }
    if (event.key === 'Enter' && event.target === input && !event.isComposing) {
      if (options.mode === 'text' && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const selected = list.querySelector<HTMLButtonElement>('[aria-selected=true]');
      if (options.mode === 'tags') addTag(selected?.textContent ?? input.value);
      else void commit(selected?.textContent ?? input.value);
    }
  };
  cancel.onclick = close;
  save.onclick = () => { if (options.mode === 'tags' && input.value.trim()) addTag(input.value); void commit(options.mode === 'tags' ? tags : input.value); };
  input.oninput = render;
  root.onclick = (event) => event.stopPropagation();
  doc.addEventListener('pointerdown', outside, true); doc.addEventListener('keydown', keydown); activeEditors.set(doc, close);
  render(); input.focus(); if (options.mode !== 'tags') input.select();
  return close;
}
