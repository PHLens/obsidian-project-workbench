import type { ProjectSnapshot, ProblemSummary } from '../../model/types';
import type { WorkbenchViewState } from '../../model/view-state';
import type { WorkbenchActions } from './workbench-shell';
import { renderProblemRow } from './problem-row';

export function getProblemDisplayOrder(problems: ProblemSummary[], filter: 'all' | 'focus'): ProblemSummary[] {
  const focused = problems.filter((problem) => problem.focus);
  return filter === 'focus' ? focused : [...focused, ...problems.filter((problem) => !problem.focus)];
}

export function renderProblemTable(container: HTMLElement, snapshot: ProjectSnapshot, state: WorkbenchViewState, actions: WorkbenchActions): HTMLElement {
  const table = container.createDiv({ cls: 'rw-problem-table' });
  const problems = getProblemDisplayOrder(snapshot.problems, state.problemFilter);
  if (!problems.length) { table.createDiv({ cls: 'rw-table-empty', text: '当前筛选下没有研究问题' }); return table; }
  for (const problem of problems) renderProblemRow(table, problem, actions, state.expandedNextSteps.includes(problem.path));
  return table;
}
