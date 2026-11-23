import type { ProjectSnapshot, SearchResult } from '../../model/types';
export interface SearchOptions { fullText?: boolean; includeArchived?: boolean; }
export function searchWorkbench(snapshot: ProjectSnapshot, query: string, options: SearchOptions = {}): SearchResult[] {
  const q = query.trim().toLocaleLowerCase(); if (!q) return [];
  const results: SearchResult[] = [];
  const match = (title: string, summary: string | undefined, body: string | undefined, path: string): boolean => title.toLocaleLowerCase().includes(q) || (summary ?? '').toLocaleLowerCase().includes(q) || path.toLocaleLowerCase().includes(q) || (!!options.fullText && (body ?? '').toLocaleLowerCase().includes(q));
  if (match(snapshot.project.title, snapshot.project.goal, snapshot.project.searchText, snapshot.project.path) && (options.includeArchived || !snapshot.project.archived)) results.push({ path: snapshot.project.path, title: snapshot.project.title, kind: 'project' });
  for (const problem of snapshot.problems) if ((options.includeArchived || !problem.archived) && match(problem.title, problem.summary ?? problem.nextSteps[0], problem.searchText, problem.path)) results.push({ path: problem.path, title: problem.title, kind: 'problem' });
  for (const task of snapshot.tasks) if ((options.includeArchived || !task.archived) && match(task.title, task.priority, task.searchText, task.path)) results.push({ path: task.path, title: task.title, kind: 'task' });
  for (const input of snapshot.pendingInputs) if ((options.includeArchived || !input.archived) && match(input.title, input.status, input.searchText, input.path)) results.push({ path: input.path, title: input.title, kind: 'input' });
  return results;
}
