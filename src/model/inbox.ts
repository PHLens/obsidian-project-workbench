import { parseNote, titleFor } from './frontmatter';
import { isPathInDirectories } from './data-scope';
import { normalizeLink } from './types';
import type { PendingInputSummary, VaultFile } from './types';

export type InputKind = 'paper' | 'idea' | 'note';
export type InboxView = 'pending' | 'processed' | 'all';
export interface InboxEntry extends PendingInputSummary {
  kind: InputKind;
  projects: string[];
  problems: string[];
  sourceValue?: string;
  summary?: string;
}
export interface InboxAssociation { kind: 'project' | 'problem'; path: string; }
export interface InboxFilters { view?: InboxView; kind?: InputKind | 'all'; query?: string; association?: InboxAssociation | null; problemPaths?: string[]; }
export const PROCESSED_STATES = ['linked', 'deferred', 'reference'] as const;
export function stringLinks(value: unknown): string[] {
  return typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((link): link is string => typeof link === 'string') : [];
}
export function resolveAssociationPath(link: string, files: Array<{ path: string }>): string | undefined {
  const target = normalizeLink(link);
  if (!target) return undefined;
  const exact = files.find((file) => file.path === target || file.path.replace(/\.md$/, '') === target);
  if (exact) return exact.path;
  const matches = files.filter((file) => file.path.split('/').pop()?.replace(/\.md$/, '') === target);
  return matches.length === 1 ? matches[0].path : undefined;
}
export function buildInboxIndex(files: VaultFile[], options: { inputDirectories?: string[]; includeArchived?: boolean } = {}): InboxEntry[] {
  return files.filter((file) => !options.inputDirectories || isPathInDirectories(file.path, options.inputDirectories)).flatMap((file) => {
    const note = parseNote(file);
    const fm = note.frontmatter;
    const tags = stringLinks(fm.tags);
    const enrolled = fm.type === 'inbox' || typeof fm.processing_status === 'string' || fm.pending === true || fm.pending === 'true' || fm.review_status === 'pending' || tags.some((tag) => tag.replace(/^#/, '') === 'pending-discussion');
    const archived = fm.archived === true || fm.archived === 'true' || fm.status === 'archived';
    if (!enrolled || (archived && !options.includeArchived)) return [];
    const status = typeof fm.processing_status === 'string' && fm.processing_status.trim() ? fm.processing_status : 'pending';
    const projects = [...new Set([...stringLinks(fm.project), ...stringLinks(fm.projects)])];
    const bodySummary = (note.body ?? '').split('\n').map((line) => line.trim()).find((line) => line && !line.startsWith('#'));
    return [{ path: file.path, title: titleFor(note), kind: (['paper', 'idea', 'note'].includes(String(fm.input_kind)) ? fm.input_kind : fm.type === 'idea' ? 'idea' : 'note') as InputKind, status,
      project: typeof fm.project === 'string' ? fm.project : undefined, projects, problems: [...new Set(stringLinks(fm.problems))],
      sourceValue: typeof fm.source === 'string' ? fm.source : undefined,
      summary: typeof fm.summary === 'string' ? fm.summary : bodySummary?.slice(0, 240), archived, searchText: file.content, source: { path: file.path, kind: 'input' } }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
export function inboxForProject(entries: InboxEntry[], projectPath: string, problemPaths: string[], files: Array<{ path: string }>): InboxEntry[] {
  const problems = new Set(problemPaths);
  return entries.filter((entry) => entry.projects.some((link) => resolveAssociationPath(link, files) === projectPath)
    || entry.problems.some((link) => { const path = resolveAssociationPath(link, files); return !!path && problems.has(path); }));
}
export function filterInbox(entries: InboxEntry[], filters: InboxFilters, files: Array<{ path: string }>): InboxEntry[] {
  let filtered = entries;
  const association = filters.association;
  if (association?.kind === 'project') filtered = inboxForProject(filtered, association.path, filters.problemPaths ?? [], files);
  else if (association) filtered = filtered.filter((entry) => entry.problems.some((link) => resolveAssociationPath(link, files) === association.path));
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return filtered.filter((entry) => (!filters.view || filters.view === 'all' || (filters.view === 'pending' ? entry.status === 'pending' : (PROCESSED_STATES as readonly string[]).includes(entry.status)))
    && (!filters.kind || filters.kind === 'all' || entry.kind === filters.kind)
    && (!query || [entry.title, entry.summary, entry.sourceValue, ...entry.projects, ...entry.problems].some((value) => value?.toLocaleLowerCase().includes(query))));
}
