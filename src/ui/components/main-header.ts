import { renderIcon } from './icon';
import type { WorkbenchActions, WorkbenchRenderContext } from './workbench-shell';

export const SEARCH_CONTROL_CONTRACT = { inputType: 'text' as const, role: 'searchbox' as const, iconPointerEvents: 'none' as const, iconCount: 1 as const };
export function getSearchControlContract(): typeof SEARCH_CONTROL_CONTRACT { return SEARCH_CONTROL_CONTRACT; }

export function renderMainHeader(container: HTMLElement, context: WorkbenchRenderContext, actions: WorkbenchActions): HTMLElement {
  const header = container.createDiv({ cls: 'rw-topbar' });
  const brand = header.createDiv({ cls: 'rw-brand' }); const brandIcon = brand.createSpan({ cls: 'rw-brand-icon' }); renderIcon(brandIcon, 'network'); brand.createEl('strong', { text: '研究工作台' });
  const search = header.createDiv({ cls: 'rw-search-wrap' });
  const input = search.createEl('input', { cls: 'rw-search', type: SEARCH_CONTROL_CONTRACT.inputType, placeholder: '搜索项目、研究问题与资料', value: context.state.query });
  input.setAttribute('role', SEARCH_CONTROL_CONTRACT.role);
  input.oninput = () => actions.setQuery(input.value);
  const searchIcon = search.createSpan({ cls: 'rw-search-icon' }); renderIcon(searchIcon, 'search');
  const record = header.createEl('button', { cls: 'rw-button rw-record-button', text: '＋ 记录想法' }); record.onclick = actions.recordIdea;
  return header;
}
