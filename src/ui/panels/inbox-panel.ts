import { getInboxCounts, filterInbox, type InboxEntry, type InboxFilters } from '../../model/inbox';
import { normalizeLink } from '../../model/types';
import type { WorkbenchActions } from '../components/workbench-shell';
const KIND_LABELS = { paper: '论文', idea: '想法', note: '笔记' };
const STATE_LABELS: Record<string, string> = { pending: '待处理', processed: '已处理' };
export function renderInboxPanel(container: HTMLElement, context: { entries: InboxEntry[]; filters: InboxFilters; files: Array<{ path: string }> }, actions: WorkbenchActions): HTMLElement {
  const panel = container.createDiv({ cls: 'rw-panel rw-inbox-panel' });
  const heading = panel.createDiv({ cls: 'rw-section-head' }); heading.createEl('h2', { text: '资料收件箱' });
  const capture = heading.createDiv({ cls: 'rw-section-actions' });
  capture.createEl('button', { cls: 'rw-button rw-primary', text: '＋ 新增资料' }).onclick = () => actions.recordIdea();
  capture.createEl('button', { cls: 'rw-button', text: '引用已有笔记' }).onclick = () => actions.addExistingNote();
  panel.createEl('p', { cls: 'rw-muted', text: '待处理：初步觉得有价值，尚未完全确认。已处理：已确认价值并整理，可作为 source 溯源。' });
  const controls = panel.createDiv({ cls: 'rw-inbox-controls' });
  const counts = getInboxCounts(filterInbox(context.entries, { ...context.filters, view: 'all' }, context.files));
  for (const [value, label] of [['pending', '待处理'], ['processed', '已处理'], ['all', '全部']] as const) {
    const button = controls.createEl('button', { cls: `rw-filter-tab ${context.filters.view === value ? 'is-active' : ''}`, attr: { 'aria-label': label } });
    button.dataset.inboxView = value;
    const count = value === 'all' ? counts.total : counts[value];
    button.setAttribute('aria-description', `当前范围 ${count} 条${value === 'all' ? '' : label}资料`);
    button.createSpan({ text: label });
    button.createSpan({ cls: 'rw-inbox-tab-count', text: String(value === 'all' ? counts.total : counts[value]), attr: { 'aria-hidden': 'true' } });
    button.onclick = () => actions.setInboxView(value);
  }
  const kind = controls.createEl('select', { attr: { 'aria-label': '资料类型筛选' } });
  for (const [value, label] of [['all', '全部类型'], ['paper', '论文'], ['idea', '想法'], ['note', '笔记']]) kind.createEl('option', { value, text: label });
  kind.value = context.filters.kind ?? 'all'; kind.onchange = () => actions.setInboxKind(kind.value as 'all' | 'paper' | 'idea' | 'note');
  if (context.filters.association) {
    const filter = panel.createDiv({ cls: 'rw-inbox-scope' }); filter.createSpan({ text: `关联${context.filters.association.kind === 'project' ? '项目' : '问题'}：${context.filters.association.path}` });
    filter.createEl('button', { cls: 'rw-link-button', text: '清除筛选' }).onclick = actions.clearInboxAssociation;
  }
  const entries = filterInbox(context.entries, context.filters, context.files);
  for (const entry of entries) {
    const row = panel.createDiv({ cls: 'rw-inbox-entry' }); row.dataset.path = entry.path;
    const identity = row.createDiv({ cls: 'rw-inbox-entry-heading' });
    identity.createEl('button', { cls: 'rw-inbox-title', text: entry.title }).onclick = () => actions.openPending(entry);
    identity.createEl('small', { cls: 'rw-source-tag', text: KIND_LABELS[entry.kind] });
    if (entry.summary) row.createEl('p', { cls: 'rw-muted', text: entry.summary });
    const links = row.createDiv({ cls: 'rw-association-chips' });
    for (const [type, values] of [['项目', entry.projects], ['问题', entry.problems]] as const) for (const value of values) links.createSpan({ cls: 'rw-source-tag', text: `${type}：${normalizeLink(value) ?? value}` });
    if (!entry.projects.length && !entry.problems.length) links.createSpan({ cls: 'rw-muted', text: '尚未关联' });
    if (entry.sourceValue) {
      const source = row.createDiv({ cls: 'rw-inbox-source' }); source.createEl('small', { cls: 'rw-muted', text: entry.sourceValue });
      source.createEl('button', { cls: 'rw-link-button', text: '打开来源' }).onclick = () => actions.openSource(entry);
    }
    const actionsRow = row.createDiv({ cls: 'rw-inbox-entry-actions' });
    actionsRow.createEl('button', { cls: 'rw-button', text: '关联项目 / 问题' }).onclick = () => actions.editInputAssociations(entry);
    const status = actionsRow.createEl('select', { attr: { 'aria-label': `处理状态 ${entry.title}` } });
    for (const [value, label] of Object.entries(STATE_LABELS)) status.createEl('option', { value, text: label });
    if (!Object.prototype.hasOwnProperty.call(STATE_LABELS, entry.status)) status.createEl('option', { value: entry.status, text: entry.status });
    status.value = entry.status; status.onchange = () => actions.transitionPending(entry, status.value as 'pending' | 'processed');
  }
  if (!entries.length) panel.createEl('p', { cls: 'rw-muted rw-inbox-empty', text: '当前范围暂无资料，可以新增或引用已有笔记。' });
  return panel;
}
