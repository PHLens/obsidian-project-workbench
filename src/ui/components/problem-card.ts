import type { ProblemSummary } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderPropertyButton } from './property-button';

let nextCardId = 0;
export function renderProblemCard(container: HTMLElement, problem: ProblemSummary, actions: WorkbenchActions, expanded = false): HTMLElement {
  const id = 'rw-problem-card-' + ++nextCardId;
  const card = container.createDiv({ cls: 'rw-problem-row rw-problem-card' + (problem.focus ? ' is-focus' : '') + (problem.archived ? ' is-archived' : ''), attr: { role: 'article', 'aria-labelledby': id } });
  const body = card.createDiv({ cls: 'rw-problem-main' });
  if (problem.focus) body.createDiv({ cls: 'rw-problem-focus-label', text: '本阶段关注' });
  const identity = body.createDiv({ cls: 'rw-problem-identity' });
  const heading = identity.createEl('strong');
  const title = heading.createEl('button', { cls: 'rw-problem-title', text: problem.title, type: 'button', attr: { id } });
  title.onclick = () => actions.openProblem(problem);
  renderPropertyButton(identity, { path: problem.path, field: 'status', label: '问题状态', value: problem.status ?? '', className: 'rw-status', onEdit: anchor => actions.editProperty(problem.path, 'problem', 'status', anchor) });
  body.createEl('p', { cls: 'rw-problem-summary' + (problem.summary ? '' : ' rw-muted'), text: problem.summary ?? '概述待补充' });
  const meta = body.createDiv({ cls: 'rw-problem-meta' });
  for (const [field, label, value] of [['stage', '阶段', problem.stage ?? ''], ['research_role', '角色', problem.researchRole ?? ''], ['tags', '标签', problem.tags ?? []]] as const) {
    const group = meta.createDiv({ cls: 'rw-property-group' }); group.createEl('small', { cls: 'rw-muted', text: label });
    renderPropertyButton(group, { path: problem.path, field, label, value, onEdit: anchor => actions.editProperty(problem.path, 'problem', field, anchor) });
  }
  const steps = problem.nextStepItems ?? problem.nextSteps.map(text => ({ text, depth: 0, line: 0, completed: undefined }));
  const next = body.createDiv({ cls: 'rw-next-steps' });
  const nextHead = next.createDiv({ cls: 'rw-next-steps-head' });
  nextHead.createEl('strong', { text: 'Next Step' });
  const checklist = steps.length > 0 && steps.every(item => item.completed !== undefined);
  nextHead.createSpan({ cls: 'rw-muted', text: checklist ? steps.filter(item => !item.completed).length + ' 项待办 · 共 ' + steps.length + ' 项' : '共 ' + steps.length + ' 项' });
  const source = nextHead.createEl('button', { cls: 'rw-link-button', text: '原文', type: 'button', attr: { 'aria-label': '打开 Next Step 原文' } });
  source.dataset.action = 'open-next-steps'; source.onclick = () => actions.openNextSteps(problem);
  if (!steps.length) next.createEl('p', { cls: 'rw-next-steps-empty rw-muted', text: '尚未记录下一步' });
  else {
    const list = next.createEl('ul', { cls: 'rw-next-steps-list', attr: { id: id + '-steps' } });
    steps.forEach((item, index) => {
      const li = list.createEl('li', { cls: 'rw-next-step' + (item.completed ? ' is-completed' : '') });
      li.hidden = index >= 3 && !expanded;
      li.style.paddingInlineStart = Math.min(4, item.depth) * 12 + 'px';
      if (item.completed === undefined) li.createSpan({ cls: 'rw-next-step-bullet', attr: { 'aria-hidden': 'true' } });
      else {
        const checkbox = li.createEl('input', { cls: 'rw-next-step-checkbox', type: 'checkbox', attr: { 'aria-label': item.completed ? '已完成' : '未完成', title: '在原文中编辑完成状态' } });
        checkbox.checked = item.completed; checkbox.disabled = true;
      }
      li.createSpan({ cls: 'rw-next-step-text', text: item.text });
    });
    if (steps.length > 3) {
      const toggle = next.createEl('button', { cls: 'rw-next-steps-toggle rw-link-button', type: 'button', attr: { 'aria-controls': list.id } });
      let open = expanded;
      const update = () => { toggle.textContent = open ? '收起清单' : '展开全部 ' + steps.length + ' 项'; toggle.setAttribute('aria-expanded', String(open)); };
      update();
      toggle.dataset.action = 'toggle-next-steps';
      toggle.onclick = () => {
        open = !open;
        list.querySelectorAll<HTMLElement>('.rw-next-step').forEach((li, index) => { li.hidden = index >= 3 && !open; });
        update(); actions.setNextStepsExpanded(problem.path, open);
      };
    }
  }
  const footer = card.createDiv({ cls: 'rw-problem-footer' });
  footer.createSpan({ cls: 'rw-problem-last', text: problem.archived ? '已归档' : problem.lastUpdated ?? '待首次整理' });
  const material = footer.createDiv({ cls: 'rw-problem-material-actions' });
  const add = material.createEl('button', { cls: 'rw-link-button', text: '＋ 添加资料', type: 'button' }); add.dataset.action = 'add-material'; add.onclick = () => actions.recordIdea({ problemPath: problem.path });
  const show = material.createEl('button', { cls: 'rw-link-button', text: '查看资料', type: 'button' }); show.onclick = () => actions.viewMaterial('problem', problem.path);
  const secondary = footer.createEl('details', { cls: 'rw-card-menu' }); secondary.createEl('summary', { text: '更多' });
  const menu = secondary.createDiv({ cls: 'rw-row-menu' });
  for (const [label, action] of [['编辑', () => actions.edit(problem.path)], [problem.focus ? '取消焦点' : '设为焦点', () => actions.toggleFocus(problem)], ['归档', () => actions.archive(problem.path)]] as const) {
    const button = menu.createEl('button', { text: label, type: 'button', attr: { 'aria-label': label } }); button.onclick = () => { secondary.open = false; action(); };
  }
  return card;
}
