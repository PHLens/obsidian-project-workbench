import type { ProjectSnapshot, ProjectSummary, TimelineEvent, ProblemSummary, PendingInputSummary } from '../../model/types';
import { filterWorkbenchItems } from '../../model/project-snapshot';
import type { WorkbenchViewState } from '../../model/view-state';
import { renderProjectSidebar } from './project-sidebar';
import { renderMainHeader } from './main-header';
import { renderProblemTable } from './problem-table';
import { renderFocusPanel } from './focus-panel';
import { renderTimeline } from './recent-timeline';
import { renderPendingInbox } from './pending-inbox';
import { renderEmptyState } from './empty-state';
import { renderIcon } from './icon';

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
  openTask: (path: string) => void;
  editTask: (path: string) => void;
  associateProblem: () => void;
  recordIdea: () => void;
  openGoals: () => void;
  openRecords: () => void;
  openInbox: () => void;
  archive: (path: string) => void;
  edit: (path: string) => void;
  toggleFocus: (problem: ProblemSummary) => void;
  openEvent: (event: TimelineEvent) => void;
  openPending: (input: PendingInputSummary) => void;
  transitionPending: (input: PendingInputSummary, status: 'pending' | 'linked' | 'deferred' | 'reference') => void;
}

export interface WorkbenchRenderContext {
  state: WorkbenchViewState;
  projects: ProjectSummary[];
  snapshot: ProjectSnapshot;
  events: TimelineEvent[];
}

export interface WorkbenchLayoutState {
  regions: string[];
  navigation: string[];
  actions: string[];
  problemRows: Array<{ title: string; status?: string; focus: boolean; source: string }>;
  emptyProblemState: boolean;
}

export function getWorkbenchLayoutState(context: WorkbenchRenderContext): WorkbenchLayoutState {
  return {
    regions: ['topbar', 'project-sidebar', 'main-workspace', 'focus-panel', 'recent-timeline', 'pending-inbox'],
    navigation: ['项目工作台', '阶段目标', '进展记录', '收件箱', '项目笔记'],
    actions: ['新建项目', '记录想法', '新建问题', '从已有问题关联'],
    problemRows: context.snapshot.problems.map((problem) => ({ title: problem.title, status: problem.status, focus: problem.focus, source: problem.source.kind })),
    emptyProblemState: context.snapshot.problems.length === 0,
  };
}

export function renderWorkbench(container: HTMLElement, context: WorkbenchRenderContext, actions: WorkbenchActions): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: `research-workbench rw-shell rw-density-${context.state.density}` });
  root.dataset.panel = context.state.panel;
  renderMainHeader(root, context, actions);
  const layout = root.createDiv({ cls: 'rw-layout' });
  renderProjectSidebar(layout, context.projects, context.state, actions);
  const main = layout.createDiv({ cls: 'rw-main-column' });
  if (context.state.panel === 'workspace') {
    const header = main.createDiv({ cls: 'rw-project-header' });
    header.createDiv({ cls: 'rw-project-kicker', text: '研究项目' });
    const titleLine = header.createDiv({ cls: 'rw-project-title-line' });
    const projectMark = titleLine.createSpan({ cls: 'rw-project-mark' }); renderIcon(projectMark, 'network');
    titleLine.createEl('h1', { text: context.snapshot.project.title });
    header.createEl('p', { cls: 'rw-project-goal', text: context.snapshot.project.goal ?? '目标待补充' });
    const problemArea = main.createDiv({ cls: 'rw-problem-area' });
    const sectionHead = problemArea.createDiv({ cls: 'rw-section-head' });
    sectionHead.createEl('h2', { text: '研究问题' });
    const headActions = sectionHead.createDiv({ cls: 'rw-section-actions' });
    headActions.createEl('button', { cls: 'rw-button rw-primary', text: '＋ 新建问题' }).onclick = actions.createProblem;
    const tabs = problemArea.createDiv({ cls: 'rw-filter-tabs' });
    for (const [key, label] of [['all', `全部问题 ${context.snapshot.problems.length}`], ['focus', `本阶段关注 ${context.snapshot.focusProblemPaths.length}`]] as const) {
      const button = tabs.createEl('button', { cls: `rw-filter-tab ${context.state.problemFilter === key ? 'is-active' : ''}`, text: label });
      button.onclick = () => actions.setProblemFilter(key);
    }
    const filter = problemArea.createEl('button', { cls: 'rw-button rw-filter-button', text: '☷ 筛选' });
    filter.onclick = () => {
      const panel = problemArea.querySelector('.rw-filter-panel') as HTMLElement | null;
      if (panel) { panel.remove(); return; }
      const controls = problemArea.createDiv({ cls: 'rw-filter-panel' });
      const status = controls.createEl('select'); status.multiple = true; status.setAttribute('aria-label', '状态筛选');
      for (const value of ['proposed', 'active', 'exploring', 'in-progress', 'completed', 'archived']) status.createEl('option', { value, text: value });
      const stage = controls.createEl('select'); stage.multiple = true; stage.setAttribute('aria-label', '阶段筛选');
      for (const value of ['inbox', 'analysis', 'evaluation', 'decision', 'completed']) stage.createEl('option', { value, text: value });
      const role = controls.createEl('select'); role.multiple = true; role.setAttribute('aria-label', '资源角色筛选');
      for (const value of ['mainline', 'probe', 'parked']) role.createEl('option', { value, text: value });
      const archived = controls.createEl('label'); const archivedInput = archived.createEl('input', { type: 'checkbox' }); archived.appendText(' 显示已归档');
      const fullText = controls.createEl('label'); const fullTextInput = fullText.createEl('input', { type: 'checkbox' }); fullText.appendText(' 搜索正文');
      const apply = controls.createEl('button', { cls: 'rw-button rw-primary', text: '应用筛选' });
      apply.onclick = () => { const values = (select: HTMLSelectElement) => Array.from(select.selectedOptions).map((option) => option.value); actions.setFilters({ status: values(status), stage: values(stage), researchRole: values(role), __includeArchived: archivedInput.checked ? ['true'] : [], __fullText: fullTextInput.checked ? ['true'] : [] }); };
    };
    const filtered = filterWorkbenchItems(context.snapshot, context.state.query, { fullText: context.state.fullText, includeArchived: context.state.includeArchived, status: context.state.status, stage: context.state.stage, researchRole: context.state.researchRole, sources: context.state.sources });
    const filteredSnapshot = { ...context.snapshot, problems: filtered.problems, tasks: filtered.tasks, pendingInputs: filtered.pendingInputs };
    if (filtered.problems.length === 0) renderEmptyState(problemArea, context.state.query ? 'search' : 'problem', actions);
    else renderProblemTable(problemArea, filteredSnapshot, context.state, actions);
  } else {
    const panel = main.createDiv({ cls: 'rw-panel-placeholder' });
    panel.createEl('h2', { text: context.state.panel === 'goals' ? '阶段目标' : context.state.panel === 'records' ? '进展记录' : context.state.panel === 'inbox' ? '收件箱' : '项目笔记' });
    panel.createEl('p', { text: context.state.panel === 'goals' ? context.snapshot.project.currentGate ?? '当前门槛待补充' : context.state.panel === 'records' ? `${context.snapshot.records.length} 条研究记录` : context.state.panel === 'inbox' ? `${context.snapshot.pendingInputs.length} 条待讨论输入` : '打开项目原 Markdown 正文阅读和编辑。' });
  }
  const rail = layout.createDiv({ cls: 'rw-right-rail' });
  renderFocusPanel(rail, context.snapshot, actions);
  renderTimeline(rail, context.events, actions);
  renderPendingInbox(rail, context.snapshot.pendingInputs, actions);
  return root;
}
