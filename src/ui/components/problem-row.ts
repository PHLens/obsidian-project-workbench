import type { ProblemSummary } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';
import { renderPropertyButton } from './property-button';
export function renderProblemRow(container: HTMLElement, problem: ProblemSummary, actions: WorkbenchActions): HTMLElement {
  const row = container.createDiv({ cls: `rw-problem-row ${problem.focus ? 'is-focus' : ''} ${problem.archived ? 'is-archived' : ''}` }); row.onclick = () => actions.openProblem(problem);
  const icon = row.createSpan({ cls: 'rw-problem-type-icon' }); renderIcon(icon, problem.focus ? 'target' : 'git-branch'); icon.setAttribute('aria-hidden', 'true');
  const body = row.createDiv({ cls: 'rw-problem-main' }); const identity = body.createDiv({ cls: 'rw-problem-identity' }); identity.createEl('strong', { text: problem.title, attr: { title: problem.title } });
  renderPropertyButton(identity, { path: problem.path, field: 'status', label: '问题状态', value: problem.status ?? '', className: 'rw-status', onEdit: (anchor) => actions.editProperty(problem.path, 'problem', 'status', anchor) });
  body.createEl('p', { cls: 'rw-problem-summary', text: problem.summary ?? problem.nextSteps[0] ?? '理解待补充' });
  const meta = body.createDiv({ cls: 'rw-problem-meta' });
  meta.createSpan({ cls: 'rw-type-marker', text: `类型：${problem.source.kind}` });
  if (problem.focus) { const focus = meta.createSpan({ cls: 'rw-focus-tag' }); renderIcon(focus, 'flag'); focus.createSpan({ text: '本阶段关注' }); }
  for (const [field, label, value] of [['stage', '阶段', problem.stage ?? ''], ['research_role', '角色', problem.researchRole ?? ''], ['tags', '标签', problem.tags ?? []]] as const) {
    const group = meta.createDiv({ cls: 'rw-property-group' }); group.createEl('small', { cls: 'rw-muted', text: label });
    renderPropertyButton(group, { path: problem.path, field, label, value, onEdit: (anchor) => actions.editProperty(problem.path, 'problem', field, anchor) });
  }
  const material = body.createDiv({ cls: 'rw-problem-material-actions' });
  const add = material.createEl('button', { cls: 'rw-link-button', text: '＋ 添加资料' }); add.dataset.action = 'add-material'; add.onclick = (event) => { event.stopPropagation(); actions.recordIdea({ problemPath: problem.path }); };
  const show = material.createEl('button', { cls: 'rw-link-button', text: '查看资料' }); show.onclick = (event) => { event.stopPropagation(); actions.viewMaterial('problem', problem.path); };
  const last = row.createDiv({ cls: 'rw-problem-last' }); last.createEl('span', { text: problem.archived ? '已归档' : problem.lastUpdated ?? '待首次整理' }); last.createSpan({ cls: 'rw-row-arrow', text: '›' });
  const menu = row.createDiv({ cls: 'rw-row-menu' });
  for (const [label, action] of [['编辑', () => actions.edit(problem.path)], [problem.focus ? '取消焦点' : '设为焦点', () => actions.toggleFocus(problem)], ['归档', () => actions.archive(problem.path)]] as const) {
    const button = menu.createEl('button', { text: label, attr: { 'aria-label': label } }); button.onclick = (event) => { event.stopPropagation(); action(); };
  }
  return row;
}
