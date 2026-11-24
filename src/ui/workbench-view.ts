import { linkMatches } from '../model/types';
import { ItemView, Notice, TFile, WorkspaceLeaf, Menu, ConfirmationModal, type EventRef } from 'obsidian';
import { buildProjectIndex, buildProjectSnapshot, buildTimelineEvents } from '../model/project-snapshot';
import { parseNote, parseNotes, primeParsedNotes, titleFor } from '../model/frontmatter';
import { buildInboxIndex, resolveAssociationPath, stringLinks, type InboxEntry, type InboxStatus } from '../model/inbox';
import type { ProjectSnapshot, ProjectSummary, TimelineEvent, VaultFile } from '../model/types';
import { DEFAULT_WORKBENCH_STATE, type WorkbenchViewState } from '../model/view-state';
import { renderWorkbench, type WorkbenchActions } from './components/workbench-shell';
import { ProjectWizard, type ProjectWizardResult } from './modals/project-wizard';
import { TaskModal } from './modals/task-modal';
import { ProblemModal } from './modals/problem-modal';
import { createProjectBundle, createProblemForProject, archiveEntity, updateTask, writeFrontmatterWithExpectedHash, linkExistingProblemToProject, sha256 } from './vault-writes';
import { EditProblemModal } from './modals/edit-problem-modal';
import { AssociateProblemModal } from './modals/associate-problem-modal';
import { EditGoalsModal } from './modals/edit-goals-modal';
import { EditTaskModal } from './modals/edit-task-modal';
import { InboxCaptureModal, type CaptureContext, type CaptureCandidates } from './modals/inbox-capture-modal';
import { InboxAssociationsModal } from './modals/inbox-associations-modal';
import { createInboxEntry, updateInboxAssociations, changeInboxState } from './inbox-writes';
import { getPropertySuggestions, saveInlineProperty, PROPERTY_LABELS, type EditableProperty, type EntityKind } from './property-model';
import { openPropertyEditor } from './components/property-editor';
import { createRefreshScheduler, type RefreshScheduler } from './refresh-scheduler';
import { ScopedFileCache } from './scoped-file-cache';
import { getUnassociatedProblemCandidates } from './problem-candidates';
import { allDataDirectories, isPathInDirectories, resolveDataScope, type WorkbenchDataScope } from '../model/data-scope';
import { attachColumnLayout, normalizeColumnPreferences, type ColumnLayoutController, type ColumnPreferences } from './column-layout';

interface ColumnStorage { preferences?: Partial<ColumnPreferences>; save?: (value: ColumnPreferences) => void | Promise<void>; }

export const VIEW_TYPE_RESEARCH_WORKBENCH = 'research-workbench';
export class ResearchWorkbenchView extends ItemView {
  private dataScope: WorkbenchDataScope;
  private columnPreferences: ColumnPreferences;
  private columnController?: ColumnLayoutController;
  private columnRoot?: HTMLElement;
  private snapshot: ProjectSnapshot | null = null;
  private cachedFiles: VaultFile[] | null = null;
  private cachedProjects: ProjectSummary[] = [];
  private cachedEvents: TimelineEvent[] = [];
  private inbox: InboxEntry[] = [];
  private readonly fileCache = new ScopedFileCache();
  private readonly dirtyPaths = new Set<string>();
  private refreshTask: Promise<void> | null = null;
  private refreshPending = false;
  private refreshScheduler: RefreshScheduler | null = null;
  private queryRenderTimer: ReturnType<typeof setTimeout> | undefined;
  private closePropertyEditor: (() => void) | undefined;
  private disposed = false;
  private opened = false;
  private lifecycleVersion = 0;
  private renderPending = false;
  private readonly eventDisposers: Array<() => void> = [];
  private readonly workbenchLeaf: WorkspaceLeaf;
  private projectPath = '';
  private state: WorkbenchViewState = { ...DEFAULT_WORKBENCH_STATE, projectPath: this.projectPath };
  constructor(leaf: WorkspaceLeaf, dataScope: Partial<WorkbenchDataScope> = {}, private readonly columnStorage: ColumnStorage = {}) {
    super(leaf); this.workbenchLeaf = leaf; this.dataScope = resolveDataScope(dataScope); this.columnPreferences = normalizeColumnPreferences(columnStorage.preferences);
  }
  getViewType(): string { return VIEW_TYPE_RESEARCH_WORKBENCH; }
  getDisplayText(): string { return 'Project Workbench'; }
  getIcon(): string { return 'layout-dashboard'; }
  async onOpen(): Promise<void> {
    if (this.opened) return;
    this.opened = true; this.disposed = false; this.lifecycleVersion++;
    this.refreshScheduler = createRefreshScheduler(() => { if (this.dirtyPaths.size && this.isViewVisible()) void this.refresh(); });
    const changed = (path: string) => {
      if (this.disposed) return;
      const directories = allDataDirectories(this.dataScope);
      if (isPathInDirectories(path, directories) || directories.some((directory) => directory.startsWith(`${path}/`))) {
        this.dirtyPaths.add(path); this.refreshScheduler?.request();
      }
    };
    this.watch(this.app.vault.on('modify', (file) => { if (file.path.endsWith('.md')) changed(file.path); }), this.app.vault);
    this.watch(this.app.vault.on('create', (file) => changed(file.path)), this.app.vault);
    this.watch(this.app.vault.on('delete', (file) => changed(file.path)), this.app.vault);
    this.watch(this.app.vault.on('rename', (file, oldPath) => { changed(oldPath); changed(file.path); }), this.app.vault);
    const catchUp = () => {
      if (this.disposed || this.refreshTask || (!this.dirtyPaths.size && !this.renderPending) || !this.isViewVisible()) return;
      void this.refresh();
    };
    if (typeof this.app.workspace?.on === 'function') {
      this.watch(this.app.workspace.on('active-leaf-change', (leaf) => { if (leaf === this.workbenchLeaf) catchUp(); }), this.app.workspace);
      this.watch(this.app.workspace.on('layout-change', catchUp), this.app.workspace);
    }
    const doc = this.contentEl?.ownerDocument;
    if (doc) { doc.addEventListener('visibilitychange', catchUp); this.eventDisposers.push(() => doc.removeEventListener('visibilitychange', catchUp)); }
    await this.refresh();
  }
  private watch(ref: EventRef, source: { offref?: (ref: EventRef) => void }): void { this.eventDisposers.push(() => source.offref?.(ref)); }
  private isViewVisible(): boolean {
    const element = this.containerEl ?? this.contentEl;
    if (element?.ownerDocument?.hidden) return false;
    return typeof element?.isShown === 'function' ? element.isShown() : true;
  }
  async onClose(): Promise<void> { this.onunload(); }
  onunload(): void {
    this.disposed = true; this.lifecycleVersion++; this.refreshTask = null; this.refreshPending = false;
    this.opened = false;
    this.eventDisposers.splice(0).forEach((dispose) => dispose());
    this.columnController?.dispose(); this.columnController = undefined; this.columnRoot = undefined;
    this.refreshScheduler?.dispose(); this.closePropertyEditor?.();
    if (this.queryRenderTimer !== undefined) clearTimeout(this.queryRenderTimer);
    this.queryRenderTimer = undefined;
  }
  setDataScope(dataScope: Partial<WorkbenchDataScope>): void {
    const next = resolveDataScope(dataScope);
    if (JSON.stringify(next) === JSON.stringify(this.dataScope)) return;
    this.dataScope = next; void this.refresh();
  }
  setColumnPreferences(value: ColumnPreferences): void {
    this.columnPreferences = normalizeColumnPreferences(value);
    this.columnController?.update(this.columnPreferences);
  }
  private requireDirectory(key: keyof WorkbenchDataScope): string {
    const directory = this.dataScope[key][0];
    const labels: Record<keyof WorkbenchDataScope, string> = { projectDirectories: '项目', problemDirectories: '问题', taskDirectories: '任务', inputDirectories: '待讨论输入', recordDirectories: '进展记录' };
    if (!directory) throw new Error(`请先在插件设置中配置${labels[key]}目录。`);
    return directory;
  }
  private async files(generation = this.lifecycleVersion): Promise<VaultFile[]> {
    const directories = allDataDirectories(this.dataScope);
    const files = this.app.vault.getMarkdownFiles().filter((file) => isPathInDirectories(file.path, directories));
    const forced = new Set(this.dirtyPaths); this.dirtyPaths.clear();
    return this.fileCache.load(files, (file) => this.app.vault.read(file), forced, () => !this.disposed && generation === this.lifecycleVersion);
  }
  async refresh(): Promise<void> {
    if (this.disposed) return;
    if (this.refreshTask) { this.refreshPending = true; return this.refreshTask; }
    const generation = this.lifecycleVersion;
    const task = this.loadAndRender(generation); this.refreshTask = task;
    try { await task; } catch (error) { if (!this.disposed && generation === this.lifecycleVersion) new Notice(String(error)); }
    finally {
      if (this.refreshTask === task) {
        this.refreshTask = null;
        if (!this.disposed && generation === this.lifecycleVersion && (this.dirtyPaths.size || this.refreshPending)) this.refreshScheduler?.request();
      }
    }
  }
  private async loadAndRender(generation: number): Promise<void> {
    do {
      this.refreshPending = false;
      const files = await this.files(generation); if (this.disposed || generation !== this.lifecycleVersion) return;
      this.cachedFiles = files;
      if (!this.isViewVisible()) { this.renderPending = true; return; }
      const ready = await primeParsedNotes(files, () => !this.disposed && generation === this.lifecycleVersion && this.isViewVisible());
      if (!ready) { if (!this.disposed && generation === this.lifecycleVersion) this.renderPending = true; return; }
      this.rebuildCachedSnapshot(); this.render();
    } while (!this.disposed && generation === this.lifecycleVersion && this.refreshPending);
  }
  private async refreshAffected(...paths: string[]): Promise<void> { paths.forEach((path) => this.dirtyPaths.add(path)); await this.refresh(); }
  private rebuildCachedSnapshot(): void {
    if (!this.cachedFiles) return;
    this.inbox = buildInboxIndex(this.cachedFiles, { inputDirectories: this.dataScope.inputDirectories, includeArchived: false });
    this.cachedProjects = buildProjectIndex(this.cachedFiles, { includeArchived: this.state.includeArchived, projectDirectories: this.dataScope.projectDirectories });
    if (!this.cachedProjects.length) { this.snapshot = null; this.cachedEvents = []; this.projectPath = ''; this.state.projectPath = ''; return; }
    if (!this.cachedProjects.some((project) => project.path === this.projectPath)) this.projectPath = this.cachedProjects[0].path;
    this.state.projectPath = this.projectPath;
    this.snapshot = buildProjectSnapshot(this.cachedFiles, this.projectPath, { includeArchived: this.state.includeArchived, ...this.dataScope });
    this.cachedEvents = buildTimelineEvents(this.cachedFiles, this.snapshot, { recordDirectories: this.dataScope.recordDirectories });
  }
  private captureContext(context?: CaptureContext): CaptureContext {
    if (context?.problemPath) return { ...context, projectPath: context.projectPath ?? (this.snapshot?.problems.some((problem) => problem.path === context.problemPath) ? this.projectPath : undefined) };
    if (context) return context;
    if (this.state.panel === 'inbox') {
      const association = this.state.inboxAssociation;
      return association?.kind === 'project' ? { projectPath: association.path } : association ? this.captureContext({ problemPath: association.path }) : {};
    }
    return this.projectPath ? { projectPath: this.projectPath } : {};
  }
  private candidates(): CaptureCandidates {
    const files = this.cachedFiles ?? [];
    return { projects: buildProjectIndex(files, { includeArchived: true, projectDirectories: this.dataScope.projectDirectories }),
      problems: parseNotes(files.filter((file) => isPathInDirectories(file.path, this.dataScope.problemDirectories))).filter((note) => note.frontmatter.type === 'problem').map((note) => ({ path: note.path, title: titleFor(note), archived: note.frontmatter.archived === true || note.frontmatter.status === 'archived' })),
      notes: this.app.vault.getMarkdownFiles().map((file) => ({ path: file.path, title: file.basename })) };
  }
  private actions(): WorkbenchActions {
    return {
      selectProject: (path) => { this.projectPath = path; this.state.projectPath = path; this.rebuildCachedSnapshot(); this.renderCurrent(); },
      selectPanel: (panel) => { if (panel === 'inbox') { void this.openGlobalInbox(); return; } this.state.panel = panel; this.renderCurrent(); },
      setProblemFilter: (filter) => { this.state.problemFilter = filter; this.renderCurrent(); },
      setQuery: (query) => { this.state.query = query; if (this.queryRenderTimer !== undefined) clearTimeout(this.queryRenderTimer); this.queryRenderTimer = setTimeout(() => { this.queryRenderTimer = undefined; this.renderCurrent(); }, 40); },
      setFilters: (filters) => {
        const includeArchived = (filters.__includeArchived ?? []).includes('true');
        this.state.status = filters.status ?? []; this.state.stage = filters.stage ?? []; this.state.researchRole = filters.researchRole ?? []; this.state.sources = filters.sources ?? [];
        this.state.fullText = (filters.__fullText ?? []).includes('true');
        if (this.state.includeArchived !== includeArchived) { this.state.includeArchived = includeArchived; this.rebuildCachedSnapshot(); }
        this.renderCurrent();
      },
      toggleFullText: (value) => { this.state.fullText = value; this.renderCurrent(); },
      openProjectNote: () => { this.state.panel = 'project-note'; this.renderCurrent(); },
      openProblem: (problem) => void this.openFile(problem.path), createProject: () => void this.openProjectWizard(), createProblem: () => void this.createProblem(), createTask: () => void this.createTask(),
      projectContextMenu: (path, event) => this.showProjectContextMenu(path, event), openTask: (path) => void this.openFile(path), editTask: (path) => void this.editTask(path), associateProblem: () => void this.associateProblem(),
      recordIdea: (context) => void this.openCapture('new', this.captureContext(context)), addExistingNote: (context) => void this.openCapture('reference', this.captureContext(context)),
      openGoals: () => { this.state.panel = 'goals'; this.renderCurrent(); }, editGoals: () => void this.editGoals(), openRecords: () => { this.state.panel = 'records'; this.renderCurrent(); },
      openPendingInbox: () => void this.openGlobalInbox(),
      openInbox: () => this.viewMaterial('project', this.projectPath), archive: (path) => void this.archive(path), edit: (path) => void this.editProblem(path),
      editProperty: (path, entity, field, anchor) => void this.editInlineProperty(path, entity, field, anchor).catch((error) => new Notice(String(error))),
      toggleFocus: (problem) => void this.toggleFocus(problem.path, problem.focus), openEvent: (event) => void this.openFile(event.path), openPending: (input) => void this.openFile(input.path),
      transitionPending: (input, status) => void this.transitionPending(input.path, status), openSource: (entry) => this.openSource(entry),
      editInputAssociations: (entry) => void this.editInputAssociations(entry).catch((error) => new Notice(String(error))), viewMaterial: (kind, path) => this.viewMaterial(kind, path),
      setInboxView: (view) => { this.state.inboxView = view; this.renderCurrent(); }, setInboxKind: (kind) => { this.state.inboxKind = kind; this.renderCurrent(); },
      clearInboxAssociation: () => { this.state.inboxAssociation = null; this.renderCurrent(); },
    };
  }
  private viewMaterial(kind: 'project' | 'problem', path: string): void { this.state.panel = 'inbox'; this.state.inboxAssociation = path ? { kind, path } : null; this.state.inboxView = 'all'; this.renderCurrent(); }
  private renderCurrent(): void { if (this.cachedFiles && !this.disposed) this.render(); }
  private render(): void {
    if (!this.isViewVisible()) { this.renderPending = true; return; }
    this.renderPending = false;
    let inboxProblemPaths: string[] = [];
    const association = this.state.inboxAssociation;
    if (association?.kind === 'project' && this.cachedFiles && this.cachedProjects.some((project) => project.path === association.path)) inboxProblemPaths = buildProjectSnapshot(this.cachedFiles, association.path, { includeArchived: true, ...this.dataScope }).problems.map((problem) => problem.path);
    const active = this.contentEl.ownerDocument.activeElement;
    const composing = active && this.contentEl.contains(active) && active.matches('input.rw-search[data-composing="true"]');
    if (!composing) { this.columnController?.dispose(); this.columnController = undefined; this.columnRoot = undefined; }
    const root = renderWorkbench(this.contentEl, { state: this.state, projects: this.cachedProjects, snapshot: this.snapshot, events: this.cachedEvents, inbox: this.inbox, files: this.cachedFiles ?? [], inboxProblemPaths, inputConfigured: this.dataScope.inputDirectories.length > 0 }, this.actions());
    if (root !== this.columnRoot) {
      this.columnRoot = root;
      this.columnController = attachColumnLayout(root, this.columnPreferences, value => {
        this.columnPreferences = value;
        void Promise.resolve().then(() => this.columnStorage.save?.(value)).catch(error => new Notice('无法保存栏布局：' + String(error)));
      });
    }
  }
  private async openCapture(mode: 'new' | 'reference', context: CaptureContext = {}): Promise<void> {
    let directory: string; try { directory = this.requireDirectory('inputDirectories'); } catch (error) { new Notice(String(error)); return; }
    new InboxCaptureModal(this.app, { mode, kind: mode === 'new' ? 'idea' : 'note', context, candidates: this.candidates(), submit: async (input) => {
      const path = await createInboxEntry(this.app, input, directory); await this.refreshAffected(path);
    } }).open();
  }
  private async editInlineProperty(path: string, entity: EntityKind, field: EditableProperty, anchor: HTMLElement): Promise<void> {
    const file = this.app.vault.getFileByPath(path); if (!file) throw new Error('笔记已不存在，请重新加载。');
    const raw = await this.app.vault.read(file); if (!anchor.isConnected || this.disposed) return;
    const fm = parseNote({ path, content: raw }).frontmatter; const expectedHash = sha256(raw);
    const value = field === 'tags' ? stringLinks(fm.tags) : typeof fm[field] === 'string' ? fm[field] as string : '';
    this.closePropertyEditor = openPropertyEditor(anchor, { label: PROPERTY_LABELS[field], mode: field === 'tags' ? 'tags' : field === 'current_gate' || field === 'next_milestone' ? 'text' : 'single', value,
      choices: getPropertySuggestions((this.cachedFiles ?? []).filter((item) => isPathInDirectories(item.path, entity === 'project' ? this.dataScope.projectDirectories : this.dataScope.problemDirectories)), entity, field),
      onSave: async (value) => { await saveInlineProperty(this.app, path, expectedHash, field, value); await this.refreshAffected(path); } });
  }
  private async editInputAssociations(entry: InboxEntry): Promise<void> {
    const file = this.app.vault.getFileByPath(entry.path); if (!file) throw new Error('资料笔记已不存在。');
    const raw = await this.app.vault.read(file); const current = buildInboxIndex([{ path: entry.path, content: raw }], { includeArchived: true })[0];
    if (!current) throw new Error('资料记录已改变，请重新加载。');
    const expectedHash = sha256(raw); const candidates = this.candidates();
    new InboxAssociationsModal(this.app, current, candidates, async (links) => {
      await updateInboxAssociations(this.app, entry.path, expectedHash, links);
      await this.refreshAffected(entry.path);
    }, { onClose: () => this.renderCurrent() }).open();
  }
  private openSource(entry: InboxEntry): void {
    const value = entry.sourceValue?.trim(); if (!value) return;
    if (/^https?:\/\//i.test(value)) { window.open(value, '_blank', 'noopener,noreferrer'); return; }
    const path = resolveAssociationPath(value, this.app.vault.getMarkdownFiles());
    if (path) void this.openFile(path); else new Notice('无法找到关联的来源笔记。');
  }
  private async openFile(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (file instanceof TFile) await this.app.workspace.getLeaf('tab').openFile(file); }
  private async toggleFocus(problemPath: string, currentlyFocused: boolean): Promise<void> {
    const project = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(project instanceof TFile)) return; const raw = await this.app.vault.read(project);
    try { await writeFrontmatterWithExpectedHash(this.app, this.projectPath, sha256(raw), (frontmatter) => {
      const current = stringLinks(frontmatter.focus_problems);
      const notes = parseNotes(this.cachedFiles ?? []);
      const matches = (value: string) => linkMatches(value, problemPath, notes);
      frontmatter.focus_problems = currentlyFocused ? current.filter((value) => !matches(value)) : current.some(matches) ? current : [...current, `[[${problemPath}]]`];
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
  async openGlobalInbox(): Promise<void> { this.state.panel = 'inbox'; this.state.inboxAssociation = null; this.state.inboxView = 'pending'; this.state.inboxKind = 'all'; this.state.query = ''; this.renderCurrent(); }
  async captureExistingNote(): Promise<void> { await this.openCapture('reference', {}); }
  async createPending(): Promise<void> { await this.openCapture('new', {}); }
  private async transitionPending(path: string, status: InboxStatus): Promise<void> {
    const file = this.app.vault.getFileByPath(path); if (!file) return;
    try {
      const raw = await this.app.vault.read(file);
      await changeInboxState(this.app, path, sha256(raw), status); await this.refreshAffected(path);
    } catch (error) { new Notice(String(error)); this.renderCurrent(); }
  }
}
