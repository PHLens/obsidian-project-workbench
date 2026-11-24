import type { EditableProperty, PropertyValue } from '../property-model';
export function renderPropertyButton(container: HTMLElement, options: { path: string; field: EditableProperty; label: string; value: PropertyValue; onEdit: (anchor: HTMLElement) => void; className?: string }): HTMLButtonElement {
  const value = Array.isArray(options.value) ? options.value.join(', ') : options.value;
  const button = container.createEl('button', { cls: `rw-property-button ${options.className ?? ''}`, text: `${value || `${options.label}待补充`} ▾` });
  button.type = 'button';
  button.id = `rw-property-${encodeURIComponent(options.path)}-${options.field}`;
  button.dataset.field = options.field;
  button.setAttribute('aria-label', `编辑${options.label}：${value || '未设置'}`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.onclick = (event) => { event.stopPropagation(); options.onEdit(button); };
  return button;
}
