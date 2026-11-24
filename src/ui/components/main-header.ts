import { getInboxCounts } from '../../model/inbox';
import { renderInboxNotification } from './inbox-notification';
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
  let composing = false;
  input.addEventListener('compositionstart', () => { composing = true; input.dataset.composing = 'true'; });
  input.addEventListener('compositionend', () => { composing = false; delete input.dataset.composing; actions.setQuery(input.value); });
  input.oninput = (event) => { if (!composing && !(event as InputEvent).isComposing) actions.setQuery(input.value); };
  const searchIcon = search.createSpan({ cls: 'rw-search-icon' }); renderIcon(searchIcon, 'search');
  const capture = header.createDiv({ cls: 'rw-record-actions' });
  renderInboxNotification(capture, getInboxCounts(context.inbox ?? []).pending, actions.openPendingInbox);
  capture.createEl('button', { cls: 'rw-button rw-primary', text: '＋ 新增资料' }).onclick = () => actions.recordIdea();
  capture.createEl('button', { cls: 'rw-button', text: '引用笔记' }).onclick = () => actions.addExistingNote();
  const columns = header.createDiv({ cls: 'rw-column-controls', attr: { role: 'group', 'aria-label': '工作台栏布局' } });
  for (const [key, label] of [['left', '收起导航'], ['focus', context.state.panel === 'workspace' ? '只看问题' : '专注主区域'], ['right', '收起概览']] as const) {
    if (key === 'right' && (context.state.panel !== 'workspace' || !context.snapshot)) continue;
    const button = columns.createEl('button', { cls: 'rw-button', text: label, type: 'button' });
    button.dataset.columnToggle = key;
  }
  return header;
}
