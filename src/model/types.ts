export type Frontmatter = Record<string, unknown>;
export interface VaultFile { path: string; content: string; mtime?: number; }
export interface Note extends VaultFile { frontmatter: Frontmatter; body?: string; }
export interface SourceRef { path: string; kind: string; label?: string; }
export interface NextStepItem { text: string; completed?: boolean; depth: number; line: number; }
export interface ProblemSummary { path: string; title: string; status?: string; stage?: string; researchRole?: string; tags?: string[]; project?: string; focus: boolean; archived?: boolean; lastUpdated?: string; nextSteps: string[]; nextStepItems?: NextStepItem[]; nextStepHeading?: { text: string; line: number }; summary?: string; searchText?: string; source: SourceRef; }
export interface TaskSummary { path: string; title: string; status?: string; priority?: string; due?: string; projects: string[]; archived?: boolean; searchText?: string; source: SourceRef; }
export interface PendingInputSummary { path: string; title: string; status: string; project?: string; projects?: string[]; problems?: string[]; archived?: boolean; searchText?: string; source: SourceRef; }
export interface ChangeSummary { path: string; title: string; date?: string; source: SourceRef; }
export interface ProjectSummary { path: string; title: string; status?: string; currentGate?: string; nextMilestone?: string; goal?: string; archived?: boolean; searchText?: string; source: SourceRef; }
export interface ProjectSnapshot { schemaVersion: 1; project: ProjectSummary; problems: ProblemSummary[]; focusProblemPaths: string[]; tasks: TaskSummary[]; pendingInputs: PendingInputSummary[]; records: ChangeSummary[]; generatedAt: string; }
export interface TimelineEvent { path: string; title: string; date?: string; kind: 'record' | 'file-update'; label?: string; source: SourceRef; }
export interface WorkbenchFilters { fullText?: boolean; includeArchived?: boolean; status?: string[]; stage?: string[]; researchRole?: string[]; sources?: string[]; }
export interface FilteredWorkbenchState { problems: ProblemSummary[]; tasks: TaskSummary[]; pendingInputs: PendingInputSummary[]; }
export interface SearchResult { path: string; title: string; kind: 'project' | 'problem' | 'task' | 'input'; }

export function normalizeLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/);
  return (match?.[1] ?? value).replace(/\.md$/, '').trim() || null;
}

export function linkMatches(value: unknown, path: string, notes: Note[]): boolean {
  const normalized = normalizeLink(value);
  if (!normalized) return false;
  const base = path.replace(/\.md$/, '');
  if (normalized === base || normalized === path) return true;
  const target = notes.find((note) => note.path.replace(/\.md$/, '') === normalized || note.path.split('/').pop()?.replace(/\.md$/, '') === normalized);
  return target?.path === path;
}

import { isPathInDirectories, resolveDataScope } from './data-scope';

export function resolveProblemScope(project: Note, notes: Note[], options: { problemDirectories?: string[] } = {}): Set<string> {
  const dataScope = options.problemDirectories ? resolveDataScope(options) : undefined;
  const problems = notes.filter((note) => note.frontmatter.type === 'problem' && (!dataScope || isPathInDirectories(note.path, dataScope.problemDirectories)));
  const direct = new Set<string>();
  const explicit = Array.isArray(project.frontmatter.problems) ? project.frontmatter.problems : project.frontmatter.problems ? [project.frontmatter.problems] : [];
  for (const problem of problems) {
    if (explicit.some((value) => linkMatches(value, problem.path, notes))) direct.add(problem.path);
  }
  if (!direct.size) {
    const researchQuestion = project.body ?? project.content;
    for (const problem of problems) {
    if (researchQuestion.includes(`[[${problem.path.replace(/\.md$/, '')}]]`) || researchQuestion.includes(`[[${problem.path.split('/').pop()?.replace(/\.md$/, '')}]]`)) direct.add(problem.path);
    }
  }
  const scope = new Set(direct);
  let changed = true;
  while (changed) {
    changed = false;
    for (const problem of problems) {
      if (scope.has(problem.path)) continue;
      const up = problem.frontmatter.up;
      for (const parent of scope) {
        if (linkMatches(up, parent, notes)) { scope.add(problem.path); changed = true; break; }
      }
    }
  }
  return scope;
}
