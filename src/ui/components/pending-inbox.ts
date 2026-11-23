import type { PendingInputSummary } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';

export function renderPendingInbox(container: HTMLElement, inputs: PendingInputSummary[], actions: WorkbenchActions): HTMLElement {
  const card = container.createDiv({ cls: 'rw-inbox-card' });
  const heading = card.createDiv({ cls: 'rw-card-heading' }); const headingIcon = heading.createSpan({ cls: 'rw-card-icon' }); renderIcon(headingIcon, 'inbox'); heading.createEl('strong', { text: '资料收件箱' });
  card.createEl('small', { text: `${inputs.length} 条显式待讨论输入` });
  for (const input of inputs.slice(0, 3)) { const item = card.createDiv({ cls: 'rw-inbox-item-wrap' }); const button = item.createEl('button', { cls: 'rw-inbox-item', text: input.title }); button.onclick = () => actions.openPending(input); for (const [status, label] of [['linked', '已关联'], ['deferred', '暂缓'], ['reference', '参考']] as const) { const action = item.createEl('button', { cls: 'rw-inbox-mini-action', text: label }); action.onclick = (event) => { event.stopPropagation(); actions.transitionPending(input, status); }; } }
  const action = card.createEl('button', { cls: 'rw-link-button', text: '打开收件箱' }); action.onclick = actions.openInbox;
  return card;
}
