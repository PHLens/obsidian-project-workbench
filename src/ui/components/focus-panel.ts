import type { ProjectSnapshot } from '../../model/types';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';

export function renderFocusPanel(container: HTMLElement, snapshot: ProjectSnapshot, actions: WorkbenchActions): HTMLElement {
  const card = container.createDiv({ cls: 'rw-focus-card' });
  const heading = card.createDiv({ cls: 'rw-card-heading' }); const headingIcon = heading.createSpan({ cls: 'rw-card-icon' }); renderIcon(headingIcon, 'flag'); heading.createEl('strong', { text: '本阶段焦点' });
  const focused = snapshot.problems.filter((problem) => problem.focus);
  if (!focused.length) { card.createEl('h3', { cls: 'rw-focus-empty-title', text: '尚未设置焦点' }); card.createEl('p', { text: '从研究问题列表选择一个或多个本阶段关注的问题。' }); }
  else for (const problem of focused) { card.createEl('h3', { text: problem.title }); card.createEl('p', { text: problem.summary ?? problem.nextSteps[0] ?? '当前理解待补充' }); }
  const foot = card.createDiv({ cls: 'rw-card-foot' }); foot.createSpan({ text: snapshot.project.currentGate ?? '当前门槛待补充' }); foot.createSpan({ text: '·' }); foot.createSpan({ text: snapshot.project.nextMilestone ?? '下一里程碑待补充' });
  const button = card.createEl('button', { cls: 'rw-link-button', text: '编辑阶段目标' }); button.onclick = actions.openGoals;
  const task = card.createEl('button', { cls: 'rw-link-button', text: '＋ 添加下一任务' }); task.onclick = actions.createTask;
  if (snapshot.tasks.length) { const tasks = card.createDiv({ cls: 'rw-focus-tasks' }); tasks.createEl('small', { text: '相关任务' }); for (const item of snapshot.tasks.slice(0, 4)) { const row = tasks.createDiv({ cls: 'rw-focus-task' }); const open = row.createEl('button', { text: item.title }); open.onclick = () => actions.openTask(item.path); const edit = row.createEl('button', { text: '编辑' }); edit.onclick = () => actions.editTask(item.path); } }
  return card;
}
