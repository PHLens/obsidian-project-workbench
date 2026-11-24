import type { PendingInputSummary } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';
export function renderPendingInbox(container: HTMLElement, inputs: PendingInputSummary[], actions: WorkbenchActions): HTMLElement {
  inputs = inputs.filter((input) => !input.archived);
  const card = container.createDiv({ cls: 'rw-inbox-card' });
  const heading = card.createDiv({ cls: 'rw-card-heading' }); const icon = heading.createSpan({ cls: 'rw-card-icon' }); renderIcon(icon, 'inbox'); heading.createEl('strong', { text: '资料收件箱' });
  card.createEl('small', { text: `${inputs.length} 条当前项目待处理资料` });
  for (const input of inputs.slice(0, 3)) {
    const row = card.createDiv({ cls: 'rw-inbox-item-wrap' });
    row.createEl('button', { cls: 'rw-inbox-item', text: input.title }).onclick = () => actions.openPending(input);
    const complete = row.createEl('button', { cls: 'rw-inbox-mini-action', text: '标为已处理' });
    complete.title = '价值已确认并整理，可作为 source 溯源'; complete.onclick = () => actions.transitionPending(input, 'processed');
  }
  card.createEl('button', { cls: 'rw-link-button', text: '＋ 新增资料' }).onclick = () => actions.recordIdea();
  card.createEl('button', { cls: 'rw-link-button', text: '打开收件箱' }).onclick = actions.openInbox;
  return card;
}
