import type { ProjectSnapshot, ProjectSummary, TimelineEvent, ProblemSummary, PendingInputSummary, VaultFile } from '../../model/types';
import { filterWorkbenchItems } from '../../model/project-snapshot';
import { getInboxCounts, type InboxEntry, type InboxView, type InputKind, type InboxStatus } from '../../model/inbox';
import type { WorkbenchViewState } from '../../model/view-state';
import type { CaptureContext } from '../modals/inbox-capture-modal';
import type { EditableProperty, EntityKind } from '../property-model';
import { renderProjectSidebar } from './project-sidebar';
import { renderMainHeader } from './main-header';
import { renderProblemTable } from './problem-table';
import { renderFocusPanel } from './focus-panel';
import { renderTimeline } from './recent-timeline';
import { renderPendingInbox } from './pending-inbox';
import { renderEmptyState } from './empty-state';
import { renderIcon } from './icon';
import { renderPropertyButton } from './property-button';
import { renderInboxPanel } from '../panels/inbox-panel';
import { renderGoalsPanel } from '../panels/goals-panel';
import { renderRecordsPanel } from '../panels/records-panel';
import { renderProjectNotePanel } from '../panels/project-note-panel';

export interface WorkbenchActions {
  selectProject: (path: string) => void;
  selectPanel: (panel: WorkbenchViewState['panel']) => void;
  setProblemFilter: (filter: 'all' | 'focus') => void;
  setQuery: (query: string) => void;
  setFilters: (filters: Record<string, string[]>) => void;
  toggleFullText: (value: boolean) => void;
  openProjectNote: () => void;
  openProblem: (problem: ProblemSummary) => void;
  createProject: () => void;
  createProblem: () => void;
  createTask: () => void;
  projectContextMenu: (path: string, event: MouseEvent) => void;
  openTask: (path: string) => void;
  editTask: (path: string) => void;
  associateProblem: () => void;
  recordIdea: (context?: CaptureContext) => void;
  addExistingNote: (context?: CaptureContext) => void;
  openGoals: () => void;
  editGoals: () => void;
  openRecords: () => void;
  openInbox: () => void;
  openPendingInbox: () => void;
  archive: (path: string) => void;
  edit: (path: string) => void;
  editProperty: (path: string, entity: EntityKind, field: EditableProperty, anchor: HTMLElement) => void;
  toggleFocus: (problem: ProblemSummary) => void;
  openEvent: (event: TimelineEvent) => void;
  openPending: (input: PendingInputSummary) => void;
  transitionPending: (input: PendingInputSummary, status: InboxStatus) => void;
  openSource: (entry: InboxEntry) => void;
  editInputAssociations: (entry: InboxEntry) => void;
  viewMaterial: (kind: 'project' | 'problem', path: string) => void;
  setInboxView: (view: InboxView) => void;
  setInboxKind: (kind: InputKind | 'all') => void;
  clearInboxAssociation: () => void;
}
export interface WorkbenchRenderContext {
  state: WorkbenchViewState;
  projects: ProjectSummary[];
  snapshot: ProjectSnapshot | null;
  events: TimelineEvent[];
  inbox?: InboxEntry[];
  files?: VaultFile[];
  inboxProblemPaths?: string[];
  inputConfigured?: boolean;
}
export interface WorkbenchLayoutState { regions: string[]; navigation: string[]; actions: string[]; problemRows: Array<{ title: string; status?: string; focus: boolean; source: string }>; emptyProblemState: boolean; }
export function getWorkbenchLayoutState(context: WorkbenchRenderContext): WorkbenchLayoutState {
  return { regions: ['topbar', 'project-sidebar', 'main-workspace', 'focus-panel', 'recent-timeline', 'pending-inbox'], navigation: ['项目工作台', '阶段目标', '进展记录', '收件箱', '项目笔记'], actions: ['新建项目', '记录想法', '新建问题', '从已有问题关联'],
    problemRows: (context.snapshot?.problems ?? []).map((problem) => ({ title: problem.title, status: problem.status, focus: problem.focus, source: problem.source.kind })), emptyProblemState: !context.snapshot?.problems.length };
}
export function renderWorkbench(container: HTMLElement, context: WorkbenchRenderContext, actions: WorkbenchActions): HTMLElement {
  const active = container.ownerDocument.activeElement;
  const search = active && container.contains(active) && active.matches('input.rw-search') ? active as HTMLInputElement : null;
  if (search?.dataset.composing === 'true') {
    const existing = container.querySelector<HTMLElement>('.research-workbench');
    if (existing) return existing;
  }
  const selection = search ? { start: search.selectionStart, end: search.selectionEnd, direction: search.selectionDirection } : null;
  const scrollTop = container.scrollTop;
  const result = renderWorkbenchContents(container, context, actions);
  container.scrollTop = scrollTop;
  if (selection) {
    const replacement = container.querySelector<HTMLInputElement>('input.rw-search');
    if (replacement) {
      replacement.focus({ preventScroll: true });
      if (selection.start !== null && selection.end !== null) replacement.setSelectionRange(selection.start, selection.end, selection.direction ?? undefined);
    }
  }
  return result;
}
function renderWorkbenchContents(container: HTMLElement, context: WorkbenchRenderContext, actions: WorkbenchActions): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: `research-workbench rw-shell rw-density-${context.state.density}` }); root.dataset.panel = context.state.panel;
  renderMainHeader(root, context, actions);
  const layout = root.createDiv({ cls: `rw-layout ${context.state.panel === 'workspace' && context.snapshot ? '' : 'rw-layout-two-column'}` });
  renderProjectSidebar(layout, context.projects, context.state, actions, getInboxCounts(context.inbox ?? []).pending);
  const main = layout.createDiv({ cls: 'rw-main-column' });
  const snapshot = context.snapshot;
  if (context.state.panel === 'inbox') {
    if (context.inputConfigured === false) main.createEl('p', { cls: 'rw-muted', text: '请先在插件设置中配置并创建待讨论输入目录。' });
    renderInboxPanel(main, { entries: context.inbox ?? [], filters: { view: context.state.inboxView, kind: context.state.inboxKind, query: context.state.query, association: context.state.inboxAssociation, problemPaths: context.inboxProblemPaths }, files: context.files ?? [] }, actions);
    return root;
  }
  if (!snapshot) {
    const empty = main.createDiv({ cls: 'rw-empty-state' }); empty.createEl('h2', { text: '尚未选择项目' }); empty.createEl('p', { cls: 'rw-muted', text: '可以先在收件箱记录资料，再创建或选择项目。' });
    empty.createEl('button', { cls: 'rw-button rw-primary', text: '打开收件箱' }).onclick = () => actions.selectPanel('inbox');
    empty.createEl('button', { cls: 'rw-button', text: '新建项目' }).onclick = actions.createProject; return root;
  }
  if (context.state.panel === 'goals') {
    renderGoalsPanel(main, snapshot, actions.editGoals, (field, anchor) => actions.editProperty(snapshot.project.path, 'project', field, anchor)); return root;
  }
  if (context.state.panel === 'records') { renderRecordsPanel(main, snapshot, (path) => actions.openTask(path)); return root; }
  if (context.state.panel === 'project-note') { renderProjectNotePanel(main, snapshot, () => actions.openTask(snapshot.project.path)); return root; }
  const header = main.createDiv({ cls: 'rw-project-header' }); header.createDiv({ cls: 'rw-project-kicker', text: '研究项目' });
  const titleLine = header.createDiv({ cls: 'rw-project-title-line' }); const mark = titleLine.createSpan({ cls: 'rw-project-mark' }); renderIcon(mark, 'network');
  titleLine.createEl('h1', { text: snapshot.project.title });
  renderPropertyButton(titleLine, { path: snapshot.project.path, field: 'status', label: '项目状态', value: snapshot.project.status ?? '', onEdit: (anchor) => actions.editProperty(snapshot.project.path, 'project', 'status', anchor) });
  header.createEl('p', { cls: 'rw-project-goal', text: snapshot.project.goal ?? '目标待补充' });
  const goals = header.createDiv({ cls: 'rw-project-goal-properties' });
  for (const [field, label, value] of [['current_gate', '当前门槛', snapshot.project.currentGate], ['next_milestone', '下一里程碑', snapshot.project.nextMilestone]] as const) {
    const row = goals.createDiv({ cls: 'rw-project-goal-property' }); row.createEl('small', { cls: 'rw-muted', text: label });
    renderPropertyButton(row, { path: snapshot.project.path, field, label, value: value ?? '', onEdit: (anchor) => actions.editProperty(snapshot.project.path, 'project', field, anchor) });
  }
  const problemArea = main.createDiv({ cls: 'rw-problem-area' }); const sectionHead = problemArea.createDiv({ cls: 'rw-section-head' }); sectionHead.createEl('h2', { text: '研究问题' });
  const headActions = sectionHead.createDiv({ cls: 'rw-section-actions' }); headActions.createEl('button', { cls: 'rw-button rw-primary', text: '＋ 新建问题' }).onclick = actions.createProblem;
  const tabs = problemArea.createDiv({ cls: 'rw-filter-tabs' });
  for (const [key, label] of [['all', `全部问题 ${snapshot.problems.length}`], ['focus', `本阶段关注 ${snapshot.focusProblemPaths.length}`]] as const) {
    const button = tabs.createEl('button', { cls: `rw-filter-tab ${context.state.problemFilter === key ? 'is-active' : ''}`, text: label }); button.onclick = () => actions.setProblemFilter(key);
  }
  const filter = problemArea.createEl('button', { cls: 'rw-button rw-filter-button', text: '☷ 筛选' });
  filter.onclick = () => {
    const panel = problemArea.querySelector('.rw-filter-panel'); if (panel) { panel.remove(); return; }
    const controls = problemArea.createDiv({ cls: 'rw-filter-panel' });
    const createSelect = (label: string, values: string[], selected: string[]) => { const select = controls.createEl('select', { attr: { 'aria-label': label } }); select.multiple = true; for (const value of [...new Set([...values, ...selected])]) { const option = select.createEl('option', { value, text: value }); option.selected = selected.includes(value); } return select; };
    const status = createSelect('状态筛选', ['proposed', 'active', 'exploring', 'in-progress', 'completed', 'archived'], context.state.status);
    const stage = createSelect('阶段筛选', ['inbox', 'analysis', 'evaluation', 'decision', 'completed'], context.state.stage);
    const role = createSelect('资源角色筛选', ['mainline', 'probe', 'parked'], context.state.researchRole);
    const archived = controls.createEl('label'); const archivedInput = archived.createEl('input', { type: 'checkbox' }); archivedInput.checked = context.state.includeArchived; archived.appendText(' 显示已归档');
    const fullText = controls.createEl('label'); const fullTextInput = fullText.createEl('input', { type: 'checkbox' }); fullTextInput.checked = context.state.fullText; fullText.appendText(' 搜索正文');
    controls.createEl('button', { cls: 'rw-button rw-primary', text: '应用筛选' }).onclick = () => { const values = (select: HTMLSelectElement) => Array.from(select.selectedOptions).map((option) => option.value); actions.setFilters({ status: values(status), stage: values(stage), researchRole: values(role), __includeArchived: archivedInput.checked ? ['true'] : [], __fullText: fullTextInput.checked ? ['true'] : [] }); };
  };
  const filtered = filterWorkbenchItems(snapshot, context.state.query, { fullText: context.state.fullText, includeArchived: context.state.includeArchived, status: context.state.status, stage: context.state.stage, researchRole: context.state.researchRole, sources: context.state.sources });
  if (!filtered.problems.length) renderEmptyState(problemArea, context.state.query ? 'search' : 'problem', actions);
  else renderProblemTable(problemArea, { ...snapshot, problems: filtered.problems, tasks: filtered.tasks, pendingInputs: filtered.pendingInputs }, context.state, actions);
  const rail = layout.createDiv({ cls: 'rw-right-rail' }); renderFocusPanel(rail, snapshot, actions); renderTimeline(rail, context.events, actions); renderPendingInbox(rail, snapshot.pendingInputs, actions);
  return root;
}
