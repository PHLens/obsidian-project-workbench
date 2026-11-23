import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';

export function renderEmptyState(container: HTMLElement, kind: 'problem' | 'search', actions: WorkbenchActions): HTMLElement {
  const empty = container.createDiv({ cls: 'rw-empty-state' }); const emptyIcon = empty.createSpan({ cls: 'rw-empty-icon' }); renderIcon(emptyIcon, kind === 'problem' ? 'git-branch' : 'search');
  empty.createEl('h3', { text: kind === 'problem' ? '还没有关联研究问题' : '没有匹配结果' });
  empty.createEl('p', { text: kind === 'problem' ? '先新建一个问题，或从已有问题中选择关联到当前项目。' : '尝试修改搜索词或筛选条件。' });
  if (kind === 'problem') { empty.createEl('button', { cls: 'rw-button rw-primary', text: '＋ 新建问题' }).onclick = actions.createProblem; empty.createEl('button', { cls: 'rw-button', text: '从已有问题关联' }).onclick = actions.associateProblem; }
  return empty;
}
