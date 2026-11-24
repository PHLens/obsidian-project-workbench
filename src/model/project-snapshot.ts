import { parseNotes, parseNote, titleFor, firstHeading } from './frontmatter';
import type { ChangeSummary, FilteredWorkbenchState, Note, PendingInputSummary, ProjectSnapshot, ProjectSummary, ProblemSummary, SourceRef, TaskSummary, TimelineEvent, VaultFile, WorkbenchFilters } from './types';
export type { VaultFile } from './types';
import { linkMatches, resolveProblemScope } from './types';
import { isPathInDirectories, resolveDataScope } from './data-scope';
import { buildInboxIndex, inboxForProject } from './inbox';
import { problemOverview, readNextSteps } from './next-steps';

function asString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function asLinks(value: unknown): string[] { return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : typeof value === 'string' ? [value] : []; }
function source(path: string, kind: string, label?: string): SourceRef { return { path, kind, label }; }
function hasTag(note: Note, tag: string): boolean { const tags = asLinks((note.frontmatter ?? {}).tags); return tags.some((x) => x.replace(/^#/, '') === tag.replace(/^#/, '')); }
function isArchived(note: Note): boolean { return note.frontmatter.archived === true || note.frontmatter.archived === 'true' || note.frontmatter.status === 'archived'; }

export function isExplicitPendingInput(note: Note): boolean {
  const fm = note.frontmatter ?? parseNote(note).frontmatter ?? {};
  return fm.pending === true || fm.pending === 'true' || fm.processing_status === 'pending' || fm.review_status === 'pending' || hasTag(note, 'pending-discussion');
}

function goalText(note: Note): string | undefined {
  const body = note.body ?? '';
  const section = body.match(/^##\s+(?:Goal|Research Question|研究目标)\s*\n([\s\S]*?)(?=^##\s|$)/m)?.[1] ?? body;
  const lines=section.split('\n').map(x=>x.trim()).filter(Boolean);
  return lines.find(x=>!x.startsWith('#') && !x.startsWith('---') && !x.startsWith('-'));
}

function projectSummary(note: Note): ProjectSummary {
  return { path: note.path, title: titleFor(note), status: asString(note.frontmatter.status), currentGate: asString(note.frontmatter.current_gate), nextMilestone: asString(note.frontmatter.next_milestone), goal: goalText(note), archived: isArchived(note), searchText: `${note.content}\n${asString(note.frontmatter.source) ?? ''}`, source: source(note.path, 'project') };
}

export function buildProjectIndex(files: VaultFile[], options: { includeArchived?: boolean; projectDirectories?: string[] } = {}): ProjectSummary[] {
  const dataScope = options.projectDirectories ? resolveDataScope({ projectDirectories: options.projectDirectories }) : undefined;
  const candidates = dataScope ? files.filter((file) => isPathInDirectories(file.path, dataScope.projectDirectories)) : files;
  return parseNotes(candidates).filter((note) => note.frontmatter.type === 'project' && (options.includeArchived || !isArchived(note))).map(projectSummary).sort((a,b)=>a.path.localeCompare(b.path));
}

function problemSummary(note: Note, focus: Set<string>): ProblemSummary {
  const steps = readNextSteps(note);
  return { path: note.path, title: titleFor(note), status: asString(note.frontmatter.status), stage: asString(note.frontmatter.stage), researchRole: asString(note.frontmatter.research_role), tags: asLinks(note.frontmatter.tags), project: asString(note.frontmatter.project), focus: focus.has(note.path), archived: isArchived(note), lastUpdated: asString(note.frontmatter.dateModified) ?? asString(note.frontmatter.updated) ?? asString(note.frontmatter.date), nextSteps: steps.items.map(item => item.text), nextStepItems: steps.items, nextStepHeading: steps.heading === undefined ? undefined : { text: steps.heading, line: steps.line! }, summary: problemOverview(note), searchText: note.content, source: source(note.path, 'problem') };
}

export function resolveProjectProblems(project: Note, notes: Note[]): { confirmed: ProblemSummary[]; empty: boolean } {
  const scope = resolveProblemScope(project, notes);
  const focus = new Set(asLinks(project.frontmatter.focus_problems).map((value) => notes.find((note) => linkMatches(value, note.path, notes))?.path).filter(Boolean) as string[]);
  const problems = notes.filter((note) => scope.has(note.path)).map((note) => problemSummary(note, focus));
  return { confirmed: problems, empty: problems.length === 0 };
}

export function buildProjectSnapshot(files: VaultFile[], projectPath: string, options: { includeArchived?: boolean; projectDirectories?: string[]; problemDirectories?: string[]; taskDirectories?: string[]; inputDirectories?: string[]; recordDirectories?: string[] } = { includeArchived: true }): ProjectSnapshot {
  const dataScope = resolveDataScope(options);
  const notes = parseNotes(files);
  const project = notes.find((note) => note.path === projectPath);
  if (!project) throw new Error(`Project not found: ${projectPath}`);
  const scope = resolveProblemScope(project, notes, options.problemDirectories ? { problemDirectories: dataScope.problemDirectories } : {});
  const focus = new Set(asLinks(project.frontmatter.focus_problems).map((value) => notes.find((note) => linkMatches(value, note.path, notes))?.path).filter(Boolean) as string[]);
  const projectSummary = projectSummaryFor(project);
  const problems: ProblemSummary[] = notes.filter((note) => scope.has(note.path) && (options.includeArchived || !isArchived(note))).map((note) => problemSummary(note, focus));
  const tasks: TaskSummary[] = notes.filter((note) => (!options.taskDirectories || isPathInDirectories(note.path, dataScope.taskDirectories)) && hasTag(note, 'task') && asLinks(note.frontmatter.projects).some((value) => linkMatches(value, project.path, notes) || [...scope].some((path) => linkMatches(value, path, notes))) && (options.includeArchived || !isArchived(note))).map((note) => ({ path: note.path, title: titleFor(note), status: asString(note.frontmatter.status), priority: asString(note.frontmatter.priority), due: asString(note.frontmatter.due), projects: asLinks(note.frontmatter.projects), archived: isArchived(note), searchText: note.content, source: source(note.path, 'task') }));
  const pendingInputs = inboxForProject(buildInboxIndex(files, { inputDirectories: options.inputDirectories, includeArchived: options.includeArchived }), project.path, [...scope], files).filter((entry) => entry.status === 'pending');
  const scopedTitles = [titleFor(project), ...[...scope].map((path) => { const n = notes.find(x => x.path === path); return n ? titleFor(n) : ''; }).filter(Boolean)];
  const records: ChangeSummary[] = notes.filter((note) => (!options.recordDirectories || isPathInDirectories(note.path, dataScope.recordDirectories)) && /(?:^|\/)\d{4}-\d{2}-\d{2}\.md$/.test(note.path) && scopedTitles.some((title) => (note.body ?? '').includes(title))).map((note) => ({ path: note.path, title: firstHeading(note) ?? titleFor(note), date: note.path.match(/(\d{4}-\d{2}-\d{2})/)?.[1], source: source(note.path, 'record') }));
  return { schemaVersion: 1, project: projectSummary, problems, focusProblemPaths: [...focus], tasks, pendingInputs, records, generatedAt: 'snapshot' };
}

function projectSummaryFor(note: Note): ProjectSummary { return projectSummary(note); }

export function buildTimelineEvents(files: VaultFile[], snapshot: ProjectSnapshot, options: { recordDirectories?: string[] } = {}): TimelineEvent[] {
  const recordDirectories = options.recordDirectories ? resolveDataScope(options).recordDirectories : undefined;
  const records = snapshot.records.map((record) => ({ path: record.path, title: record.title, date: record.date, kind: 'record' as const, source: record.source }));
  if (records.length) return records.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.path.localeCompare(b.path));
  const paths = new Set([snapshot.project.source.path, ...snapshot.problems.map((p) => p.path), ...snapshot.tasks.map((t) => t.path), ...snapshot.pendingInputs.map((p) => p.path)]);
  return files.filter((file) => paths.has(file.path) && (!recordDirectories || !isPathInDirectories(file.path, recordDirectories))).map((file) => ({ path: file.path, title: file.path.split('/').pop()?.replace(/\.md$/, '') ?? file.path, kind: 'file-update' as const, label: '文件更新', date: file.mtime ? new Date(file.mtime).toISOString().slice(0, 10) : undefined, source: source(file.path, 'file-update', '文件更新') })).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.path.localeCompare(b.path));
}

export function filterWorkbenchItems(snapshot: ProjectSnapshot, query: string, filters: WorkbenchFilters = {}): FilteredWorkbenchState {
  const q = query.trim().toLocaleLowerCase();
  const match = (value: string | undefined, summary: string | undefined, searchText: string | undefined): boolean => !q || (value ?? '').toLocaleLowerCase().includes(q) || (summary ?? '').toLocaleLowerCase().includes(q) || (!!filters.fullText && (searchText ?? '').toLocaleLowerCase().includes(q));
  const values = (selected: string[] | undefined, value: string | undefined): boolean => !selected?.length || (!!value && selected.includes(value));
  const includeArchived = filters.includeArchived ?? false;
  return {
    problems: snapshot.problems.filter((p) => (includeArchived || !p.archived) && match(p.title, [p.summary ?? '', ...p.nextSteps].join('\n'), p.searchText) && values(filters.status, p.status) && values(filters.stage, p.stage) && values(filters.researchRole, p.researchRole) && values(filters.sources, p.source.kind)),
    tasks: snapshot.tasks.filter((t) => (includeArchived || !t.archived) && match(t.title, t.priority, t.searchText) && values(filters.status, t.status) && values(filters.sources, t.source.kind)),
    pendingInputs: snapshot.pendingInputs.filter((i) => (includeArchived || !i.archived) && match(i.title, i.status, i.searchText) && values(filters.status, i.status) && values(filters.sources, i.source.kind)),
  };
}
