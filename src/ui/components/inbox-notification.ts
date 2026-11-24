import { renderIcon } from './icon';
export function renderInboxBadge(container: HTMLElement, count: number): HTMLElement | null {
  if (count <= 0) return null;
  const badge = container.createSpan({ cls: 'rw-inbox-count', text: count > 99 ? '99+' : String(count) });
  badge.dataset.count = String(count); badge.setAttribute('aria-hidden', 'true'); badge.title = `${count} 条待处理资料`;
  return badge;
}
export function renderInboxNotification(container: HTMLElement, count: number, open: () => void): HTMLButtonElement {
  const button = container.createEl('button', { cls: 'rw-button rw-inbox-notification', attr: { 'aria-label': `收件箱：${count} 条待处理资料` } });
  button.type = 'button'; button.title = `${count} 条资料的价值尚未完全确认，点击查看待处理列表`;
  renderIcon(button, 'inbox'); renderInboxBadge(button, count); button.onclick = open;
  return button;
}
