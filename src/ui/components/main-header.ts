import { renderIcon } from './icon';
import type { WorkbenchActions, WorkbenchRenderContext } from './workbench-shell';

export function renderMainHeader(container: HTMLElement, context: WorkbenchRenderContext, actions: WorkbenchActions): HTMLElement {
  const header = container.createDiv({ cls: 'rw-topbar' });
  const brand = header.createDiv({ cls: 'rw-brand' }); const brandIcon = brand.createSpan({ cls: 'rw-brand-icon' }); renderIcon(brandIcon, 'network'); brand.createEl('strong', { text: '研究工作台' });
  const search = header.createDiv({ cls: 'rw-search-wrap' });
  const input = search.createEl('input', { cls: 'rw-search', type: 'search', placeholder: '搜索项目、研究问题与资料', value: context.state.query });
  input.oninput = () => actions.setQuery(input.value);
  const searchIcon = search.createSpan({ cls: 'rw-search-icon' }); renderIcon(searchIcon, 'search');
  const record = header.createEl('button', { cls: 'rw-button rw-record-button', text: '＋ 记录想法' }); record.onclick = actions.recordIdea;
  return header;
}
