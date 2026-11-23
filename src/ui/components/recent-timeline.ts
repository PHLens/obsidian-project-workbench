import type { TimelineEvent } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';

export function renderTimeline(container: HTMLElement, events: TimelineEvent[], actions: WorkbenchActions): HTMLElement {
  const section = container.createDiv({ cls: 'rw-timeline-section' }); section.createEl('h3', { text: '最近变化' });
  if (!events.length) { section.createEl('p', { cls: 'rw-muted', text: '暂无明确研究记录' }); return section; }
  const timeline = section.createDiv({ cls: 'rw-timeline' });
  for (const event of events.slice(0, 6)) { const item = timeline.createEl('button', { cls: 'rw-timeline-item' }); item.onclick = () => actions.openEvent(event); const icon = item.createSpan({ cls: `rw-timeline-icon rw-timeline-${event.kind}` }); renderIcon(icon, event.kind === 'record' ? 'notebook-pen' : 'clock-3'); const body = item.createDiv(); body.createEl('strong', { text: event.title }); body.createEl('small', { text: event.date ?? event.label ?? '待确认日期' }); }
  return section;
}
