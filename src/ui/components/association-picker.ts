import { resolveAssociationPath } from '../../model/inbox';
export interface AssociationCandidate { path: string; title: string; archived?: boolean; }
export function createAssociationPicker(container: HTMLElement, options: { label: string; candidates: AssociationCandidate[]; selected: string[] }) {
  let selected = [...options.selected];
  const root = container.createDiv({ cls: 'rw-association-picker rw-form-field' });
  const label = root.createEl('label', { cls: 'rw-form-label', text: options.label });
  const search = root.createEl('input', { cls: 'rw-modal-control', type: 'search', placeholder: `搜索${options.label}` });
  search.setAttribute('aria-label', `搜索${options.label}`);
  const chips = root.createDiv({ cls: 'rw-association-chips' });
  const list = root.createDiv({ cls: 'rw-association-results' }); list.setAttribute('role', 'group'); list.setAttribute('aria-label', options.label);
  const render = () => {
    chips.empty(); list.empty();
    for (const link of selected) {
      const path = resolveAssociationPath(link, options.candidates);
      const candidate = options.candidates.find((item) => item.path === path);
      const chip = chips.createSpan({ cls: `rw-source-tag ${candidate ? '' : 'is-unresolved'}` });
      chip.createSpan({ text: `${candidate?.title ?? link}${candidate?.archived ? '（已归档）' : candidate ? '' : '（未解析）'}` });
      const remove = chip.createEl('button', { text: '×', attr: { 'aria-label': `移除关联 ${candidate?.title ?? link}` } });
      remove.onclick = () => { selected = selected.filter((item) => item !== link); render(); };
    }
    const query = search.value.trim().toLocaleLowerCase();
    const choices = options.candidates.filter((item) => (!item.archived || selected.some((link) => resolveAssociationPath(link, options.candidates) === item.path)) && `${item.title} ${item.path}`.toLocaleLowerCase().includes(query));
    for (const candidate of choices.slice(0, 40)) {
      const row = list.createEl('label', { cls: 'rw-association-option' });
      const checkbox = row.createEl('input', { type: 'checkbox' }); checkbox.checked = selected.some((link) => resolveAssociationPath(link, options.candidates) === candidate.path);
      checkbox.disabled = candidate.archived === true;
      const body = row.createSpan(); body.createEl('strong', { text: candidate.title }); body.createEl('small', { text: candidate.path });
      checkbox.onchange = () => {
        selected = selected.filter((link) => resolveAssociationPath(link, options.candidates) !== candidate.path);
        if (checkbox.checked) selected.push(`[[${candidate.path}]]`);
        render();
      };
    }
    if (!choices.length) list.createEl('small', { cls: 'rw-muted', text: '没有可选项；可保留现有关联。' });
    if (choices.length > 40) list.createEl('small', { cls: 'rw-muted', text: '输入更多关键词缩小选择范围。' });
  };
  label.onclick = () => search.focus(); search.oninput = render; render();
  return { root, getValue: () => [...selected] };
}
