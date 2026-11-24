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
  const head = table.createDiv({ cls: 'rw-problem-table-head' });
  head.createSpan({ cls: 'rw-table-icon-spacer', attr: { 'aria-hidden': 'true' } }); head.createSpan({ text: '研究问题' }); head.createSpan({ text: '最近整理' });
  const problems = getProblemDisplayOrder(snapshot.problems, state.problemFilter);
  if (!problems.length) { table.createDiv({ cls: 'rw-table-empty', text: '当前筛选下没有研究问题' }); return table; }
  for (const problem of problems) renderProblemRow(table, problem, actions);
  return table;
}
