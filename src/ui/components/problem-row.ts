import type { ProblemSummary } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderSourceTags } from './source-tags';
import { renderIcon } from './icon';

export function renderProblemRow(container: HTMLElement, problem: ProblemSummary, actions: WorkbenchActions): HTMLElement {
  const row = container.createDiv({ cls: `rw-problem-row ${problem.focus ? 'is-focus' : ''} ${problem.archived ? 'is-archived' : ''}` });
  row.onclick = () => actions.openProblem(problem);
  const icon = row.createSpan({ cls: 'rw-problem-type-icon' }); renderIcon(icon, problem.focus ? 'target' : 'git-branch');
  icon.setAttribute('aria-hidden', 'true');
  const body = row.createDiv({ cls: 'rw-problem-main' });
  const identity = body.createDiv({ cls: 'rw-problem-identity' });
  identity.createEl('strong', { text: problem.title });
  const status = identity.createSpan({ cls: `rw-status rw-status-${problem.status ?? 'unknown'}` });
  status.createSpan({ cls: 'rw-status-dot', text: problem.status === 'completed' ? '✓' : '○' });
  status.createSpan({ text: problem.status ?? '待确认' });
  body.createEl('p', { cls: 'rw-problem-summary', text: problem.summary ?? problem.nextSteps[0] ?? '理解待补充' });
  const meta = body.createDiv({ cls: 'rw-problem-meta' });
  if (problem.focus) { const focusTag = meta.createSpan({ cls: 'rw-focus-tag' }); renderIcon(focusTag, 'flag'); focusTag.createSpan({ text: '本阶段关注' }); }
  const tags = renderSourceTags(meta, [problem.source], [problem.stage ?? '阶段待确认']); tags.addClass('rw-editable-tags'); tags.setAttribute('role', 'button'); tags.setAttribute('aria-label', '编辑问题属性'); tags.onclick = (event) => { event.stopPropagation(); actions.edit(problem.path); };
  const last = row.createDiv({ cls: 'rw-problem-last' }); last.createEl('span', { text: problem.archived ? '已归档' : problem.lastUpdated ?? '待首次整理' }); last.createSpan({ cls: 'rw-row-arrow', text: '›' });
  const menu = row.createDiv({ cls: 'rw-row-menu' });
  const edit = menu.createEl('button', { text: '编辑', attr: { 'aria-label': '编辑问题' } }); edit.onclick = (event) => { event.stopPropagation(); actions.edit(problem.path); };
  const focus = menu.createEl('button', { text: problem.focus ? '取消焦点' : '设为焦点', attr: { 'aria-label': problem.focus ? '取消焦点' : '设为焦点' } }); focus.onclick = (event) => { event.stopPropagation(); actions.toggleFocus(problem); };
  const archive = menu.createEl('button', { text: '归档', attr: { 'aria-label': '归档问题' } }); archive.onclick = (event) => { event.stopPropagation(); actions.archive(problem.path); };
  return row;
}
