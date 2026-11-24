import { ItemView, Notice, TFile, WorkspaceLeaf, Menu, ConfirmationModal } from 'obsidian';
import { buildProjectIndex, buildProjectSnapshot, buildTimelineEvents } from '../model/project-snapshot';
import type { ProjectSnapshot, ProjectSummary, TimelineEvent, VaultFile } from '../model/types';
import { DEFAULT_WORKBENCH_STATE, type WorkbenchViewState } from '../model/view-state';
import { renderWorkbench, type WorkbenchActions } from './components/workbench-shell';
import { ProjectWizard, type ProjectWizardResult } from './modals/project-wizard';
import { TaskModal } from './modals/task-modal';
import { PendingModal } from './modals/pending-modal';
import { ProblemModal } from './modals/problem-modal';
import { createProjectBundle, createProblemForProject, archiveEntity, updatePendingInput, updateTask, writeFrontmatterWithExpectedHash, linkExistingProblemToProject, sha256 } from './vault-writes';
import { renderGoalsPanel } from './panels/goals-panel';
import { renderRecordsPanel } from './panels/records-panel';
import { renderInboxPanel } from './panels/inbox-panel';
import { renderProjectNotePanel } from './panels/project-note-panel';
import { EditProblemModal } from './modals/edit-problem-modal';
import { AssociateProblemModal } from './modals/associate-problem-modal';
import { EditGoalsModal } from './modals/edit-goals-modal';
import { EditTaskModal } from './modals/edit-task-modal';
import { createRefreshScheduler, type RefreshScheduler } from './refresh-scheduler';
import { getUnassociatedProblemCandidates } from './problem-candidates';
import { allDataDirectories, isPathInDirectories, resolveDataScope, type WorkbenchDataScope } from '../model/data-scope';

export const VIEW_TYPE_RESEARCH_WORKBENCH = 'research-workbench';

export class ResearchWorkbenchView extends ItemView {
  private dataScope: WorkbenchDataScope;
  private snapshot: ProjectSnapshot | null = null;
  private cachedFiles: VaultFile[] | null = null;
  private cachedProjects: ProjectSummary[] = [];
  private cachedEvents: TimelineEvent[] = [];
  private refreshInFlight = false;
  private refreshPending = false;
  private refreshScheduler: RefreshScheduler | null = null;
  private queryRenderTimer: ReturnType<typeof setTimeout> | undefined;
  private projectPath = '';
  private state: WorkbenchViewState = { ...DEFAULT_WORKBENCH_STATE, projectPath: this.projectPath };
  constructor(leaf: WorkspaceLeaf, dataScope: Partial<WorkbenchDataScope> = {}) { super(leaf); this.dataScope = resolveDataScope(dataScope); }
  getViewType(): string { return VIEW_TYPE_RESEARCH_WORKBENCH; }
  getDisplayText(): string { return 'Project Workbench'; }
  getIcon(): string { return 'layout-dashboard'; }

  async onOpen(): Promise<void> {
    this.refreshScheduler = createRefreshScheduler(() => void this.refresh());
    this.registerEvent(this.app.vault.on('modify', (file) => { if (isPathInDirectories(file.path, allDataDirectories(this.dataScope))) this.refreshScheduler?.request(); }));
    this.registerEvent(this.app.vault.on('create', (file) => { if (isPathInDirectories(file.path, allDataDirectories(this.dataScope))) this.refreshScheduler?.request(); }));
    this.registerEvent(this.app.vault.on('delete', (file) => { if (isPathInDirectories(file.path, allDataDirectories(this.dataScope))) this.refreshScheduler?.request(); }));
    await this.refresh();
  }

  onunload(): void {
    this.refreshScheduler?.dispose();
    if (this.queryRenderTimer !== undefined) clearTimeout(this.queryRenderTimer);
    this.queryRenderTimer = undefined;
  }

  setDataScope(dataScope: Partial<WorkbenchDataScope>): void { this.dataScope = resolveDataScope(dataScope); void this.refresh(); }

  private requireDirectory(key: keyof WorkbenchDataScope): string {
    const directory = this.dataScope[key][0];
    const labels: Record<keyof WorkbenchDataScope, string> = { projectDirectories: '项目', problemDirectories: '问题', taskDirectories: '任务', inputDirectories: '待讨论输入', recordDirectories: '进展记录' };
    if (!directory) throw new Error(`请先在插件设置中配置${labels[key]}目录。`);
    return directory;
  }

  private async files(): Promise<VaultFile[]> {
    const out: VaultFile[] = [];
    const directories = allDataDirectories(this.dataScope);
    for (const file of this.app.vault.getMarkdownFiles()) if (isPathInDirectories(file.path, directories)) out.push({ path: file.path, content: await this.app.vault.read(file), mtime: file.stat.mtime });
    return out;
  }
  async refresh(): Promise<void> {
    if (this.refreshInFlight) { this.refreshPending = true; return; }
    this.refreshInFlight = true;
    try {
      this.cachedFiles = await this.files();
      this.rebuildCachedSnapshot();
      this.render();
    } finally {
      this.refreshInFlight = false;
      if (this.refreshPending) { this.refreshPending = false; void this.refresh(); }
    }
  }

  private rebuildCachedSnapshot(): void {
    if (!this.cachedFiles) return;
    this.cachedProjects = buildProjectIndex(this.cachedFiles, { includeArchived: this.state.includeArchived, projectDirectories: this.dataScope.projectDirectories });
    if (!this.cachedProjects.length) {
      this.snapshot = null;
      this.cachedEvents = [];
      return;
    }
    if (!this.cachedProjects.some((project) => project.path === this.projectPath)) this.projectPath = this.cachedProjects[0].path;
    this.state.projectPath = this.projectPath;
    this.snapshot = buildProjectSnapshot(this.cachedFiles, this.projectPath, { includeArchived: this.state.includeArchived, ...this.dataScope });
    this.cachedEvents = buildTimelineEvents(this.cachedFiles, this.snapshot, { recordDirectories: this.dataScope.recordDirectories });
  }
  private async setFrontmatter(path: string, mutate: (frontmatter: Record<string, unknown>) => void): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error(`Missing ${path}`);
    await this.app.fileManager.processFrontMatter(file, mutate);
  }
  private actions(): WorkbenchActions {
    return {
      selectProject: (path) => { this.projectPath = path; this.state.projectPath = path; this.rebuildCachedSnapshot(); this.renderCurrent(); },
      selectPanel: (panel) => { this.state.panel = panel; this.renderCurrent(); },
      setProblemFilter: (filter) => { this.state.problemFilter = filter; this.renderCurrent(); },
      setQuery: (query) => {
        this.state.query = query;
        if (this.queryRenderTimer !== undefined) clearTimeout(this.queryRenderTimer);
        this.queryRenderTimer = setTimeout(() => { this.queryRenderTimer = undefined; this.renderCurrent(); }, 40);
      },
      setFilters: (filters) => {
        const includeArchived = (filters.__includeArchived ?? []).includes('true');
        this.state.status = filters.status ?? []; this.state.stage = filters.stage ?? []; this.state.researchRole = filters.researchRole ?? []; this.state.sources = filters.sources ?? [];
        this.state.fullText = (filters.__fullText ?? []).includes('true');
        if (this.state.includeArchived !== includeArchived) { this.state.includeArchived = includeArchived; this.rebuildCachedSnapshot(); }
        this.renderCurrent();
      },
      toggleFullText: (value) => { this.state.fullText = value; this.renderCurrent(); },
      openProjectNote: () => { this.state.panel = 'project-note'; this.renderCurrent(); },
      openProblem: (problem) => void this.openFile(problem.path),
      createProject: () => void this.openProjectWizard(), createProblem: () => void this.createProblem(), createTask: () => void this.createTask(), projectContextMenu: (path, event) => this.showProjectContextMenu(path, event), openTask: (path) => void this.openFile(path), editTask: (path) => void this.editTask(path),
      associateProblem: () => void this.associateProblem(), recordIdea: () => void this.createPending(),
      openGoals: () => { this.state.panel = 'goals'; this.renderCurrent(); }, openRecords: () => { this.state.panel = 'records'; this.renderCurrent(); }, openInbox: () => { this.state.panel = 'inbox'; this.renderCurrent(); },
      archive: (path) => void this.archive(path), edit: (path) => void this.editProblem(path),
      toggleFocus: (problem) => void this.toggleFocus(problem.path, problem.focus), openEvent: (event) => void this.openFile(event.path), openPending: (input) => void this.openFile(input.path), transitionPending: (input, status) => void this.transitionPending(input.path, status),
    };
  }
  private renderCurrent(): void { if (!this.cachedFiles) return; this.render(); }
  private render(projects = this.cachedProjects, events = this.cachedEvents): void {
    if (!this.snapshot) {
      this.contentEl.setText(this.dataScope.projectDirectories.length ? '配置目录中没有研究项目。' : '请在 Project Workbench 设置中配置数据目录。');
      return;
    }
    if (this.state.panel === 'workspace') {
      renderWorkbench(this.contentEl, { state: this.state, projects, snapshot: this.snapshot, events }, this.actions());
      return;
    }
    this.contentEl.empty();
    const shell = this.contentEl.createDiv({ cls: `research-workbench rw-shell rw-density-${this.state.density}` });
    const header = shell.createDiv({ cls: 'rw-topbar' });
    header.createEl('strong', { text: '研究工作台' });
    const back = header.createEl('button', { cls: 'rw-button', text: '← 返回项目工作台' }); back.onclick = () => { this.state.panel = 'workspace'; this.renderCurrent(); };
    const main = shell.createDiv({ cls: 'rw-panel-main' });
    if (this.state.panel === 'goals') renderGoalsPanel(main, this.snapshot, () => void this.editGoals());
    else if (this.state.panel === 'records') renderRecordsPanel(main, this.snapshot, (path) => void this.openFile(path));
    else if (this.state.panel === 'inbox') renderInboxPanel(main, this.snapshot.pendingInputs, (path) => void this.openFile(path));
    else renderProjectNotePanel(main, this.snapshot, () => void this.openFile(this.snapshot?.project.path ?? this.projectPath));
  }
  private async openFile(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (file instanceof TFile) await this.app.workspace.getLeaf('tab').openFile(file); }
  private async toggleFocus(problemPath: string, currentlyFocused: boolean): Promise<void> {
    const project = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(project instanceof TFile)) return; const raw = await this.app.vault.read(project);
    try { await writeFrontmatterWithExpectedHash(this.app, this.projectPath, sha256(raw), (frontmatter) => {
      const current = Array.isArray(frontmatter.focus_problems) ? frontmatter.focus_problems.filter((value): value is string => typeof value === 'string') : [];
      const file = this.app.vault.getAbstractFileByPath(problemPath); const title = file instanceof TFile ? file.basename : problemPath.split('/').pop()?.replace(/\.md$/, '') ?? problemPath; const link = `[[${title}]]`;
      frontmatter.focus_problems = currentlyFocused ? current.filter((value) => value !== link) : [...new Set([...current, link])];
    }); await this.refresh(); } catch (error) { new Notice(String(error)); }
  }
  private async archive(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return;
    try { await archiveEntity(this.app, path, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); }
  }
  private showProjectContextMenu(path: string, event: MouseEvent): void {
    const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return;
    const menu = new Menu();
    menu.addItem((item) => item.setTitle('打开项目笔记').setIcon('file-text').onClick(() => void this.openFile(path)));
    menu.addItem((item) => item.setTitle('归档项目').setIcon('archive').onClick(async () => { try { await archiveEntity(this.app, path, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); } }));
    menu.addItem((item) => item.setTitle('删除项目').setIcon('trash-2').setWarning(true).onClick(() => void this.confirmDeleteProject(file)));
    menu.showAtMouseEvent(event);
  }
  private async confirmDeleteProject(file: TFile): Promise<void> {
    const modal = new ConfirmationModal(this.app);
    modal.setContent(`确定删除项目“${file.basename}”吗？\n\n只删除项目文件，不删除关联的问题、任务或资料。`);
    modal.addButton((button) => button.setButtonText('删除项目').setWarning().onClick(async () => { try { await this.app.vault.adapter.remove(file.path); await this.refresh(); } catch (error) { new Notice(String(error)); } }));
    modal.addCancelButton('取消');
    modal.open();
  }
  private async editProblem(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return;
    const cache = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    new EditProblemModal(this.app, { status: String(cache.status ?? 'exploring'), stage: String(cache.stage ?? 'inbox'), researchRole: String(cache.research_role ?? 'mainline') }, async (result) => { try { await writeFrontmatterWithExpectedHash(this.app, path, sha256(await this.app.vault.read(file)), (frontmatter) => { frontmatter.status = result.status; frontmatter.stage = result.stage; frontmatter.research_role = result.researchRole; }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open();
  }
  private async editGoals(): Promise<void> { if (!this.snapshot) return; const file = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(file instanceof TFile)) return; new EditGoalsModal(this.app, { currentGate: this.snapshot.project.currentGate ?? '', nextMilestone: this.snapshot.project.nextMilestone ?? '' }, async (result) => { try { await writeFrontmatterWithExpectedHash(this.app, this.projectPath, sha256(await this.app.vault.read(file)), (frontmatter) => { frontmatter.current_gate = result.currentGate; frontmatter.next_milestone = result.nextMilestone; }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open(); }
  private async editTask(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return; const cache = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}; new EditTaskModal(this.app, { status: String(cache.status ?? 'open'), priority: String(cache.priority ?? ''), due: String(cache.due ?? '') }, async (result) => { try { await updateTask(this.app, path, result, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open(); }
  private async associateProblem(): Promise<void> {
    const files = this.cachedFiles ?? []; const current = new Set(this.snapshot?.problems.map((problem) => problem.path) ?? []);
    const candidates = getUnassociatedProblemCandidates(files, current, this.dataScope.problemDirectories);
    new AssociateProblemModal(this.app, candidates, async (problemPath, focus) => { const project = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(project instanceof TFile)) return; try { await linkExistingProblemToProject(this.app, this.projectPath, problemPath, { focus, expectedHash: sha256(await this.app.vault.read(project)) }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open();
  }
  async openProjectWizard(): Promise<void> {
    try { this.requireDirectory('projectDirectories'); this.requireDirectory('problemDirectories'); } catch (error) { new Notice(String(error)); return; }
    new ProjectWizard(this.app, async (result: ProjectWizardResult) => {
      const created = await createProjectBundle(this.app, result, this.dataScope);
      this.projectPath = created.projectPath; this.state.projectPath = created.projectPath; await this.refresh(); await this.openFile(created.problemPath);
    }).open();
  }
  async createProblem(): Promise<void> { try { this.requireDirectory('problemDirectories'); } catch (error) { new Notice(String(error)); return; } new ProblemModal(this.app, async (result) => { if (!this.snapshot) return; const path = await createProblemForProject(this.app, this.projectPath, { title: result.title, question: result.question, status: 'inbox', stage: 'inbox', researchRole: 'mainline', focus: false }, this.dataScope); await this.refresh(); await this.openFile(path); }).open(); }
  async createTask(): Promise<void> { let directory: string; try { directory = this.requireDirectory('taskDirectories'); } catch (error) { new Notice(String(error)); return; } new TaskModal(this.app, async (title) => { const path = `${directory}/${title.trim()}.md`; await this.app.vault.create(path, `---\nstatus: open\ntags: [task]\nprojects: ["[[${this.snapshot?.project.title ?? 'Project'}]]"]\n---\n# ${title.trim()}\n`); await this.refresh(); }).open(); }
  async createPending(): Promise<void> { let directory: string; try { directory = this.requireDirectory('inputDirectories'); } catch (error) { new Notice(String(error)); return; } new PendingModal(this.app, async (text, source) => { const path = `${directory}/${Date.now()}-pending.md`; await this.app.vault.create(path, `---\ntype: idea\nproject: "[[${this.snapshot?.project.title ?? 'Project'}]]"\npending: true\nprocessing_status: pending\nsource: ${JSON.stringify(source)}\n---\n# Pending discussion\n\n${text}\n`); await this.refresh(); }).open(); }
  private async transitionPending(path: string, status: 'pending' | 'linked' | 'deferred' | 'reference'): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return; try { await updatePendingInput(this.app, path, status, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); } }
}
