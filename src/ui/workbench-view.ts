import { ItemView, Notice, TFile, WorkspaceLeaf, Modal } from 'obsidian';
import { buildProjectIndex, buildProjectSnapshot, buildTimelineEvents } from '../model/project-snapshot';
import type { ProjectSnapshot, VaultFile } from '../model/types';
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

export const VIEW_TYPE_RESEARCH_WORKBENCH = 'research-workbench';

export class ResearchWorkbenchView extends ItemView {
  private snapshot: ProjectSnapshot | null = null;
  private projectPath = '';
  private state: WorkbenchViewState = { ...DEFAULT_WORKBENCH_STATE, projectPath: this.projectPath };
  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType(): string { return VIEW_TYPE_RESEARCH_WORKBENCH; }
  getDisplayText(): string { return 'Project Workbench'; }
  getIcon(): string { return 'layout-dashboard'; }

  async onOpen(): Promise<void> {
    this.registerEvent(this.app.vault.on('modify', () => void this.refresh()));
    this.registerEvent(this.app.vault.on('create', () => void this.refresh()));
    this.registerEvent(this.app.vault.on('delete', () => void this.refresh()));
    await this.refresh();
  }

  private async files(): Promise<VaultFile[]> {
    const out: VaultFile[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) out.push({ path: file.path, content: await this.app.vault.read(file), mtime: file.stat.mtime });
    return out;
  }
  async refresh(): Promise<void> {
    const files = await this.files();
    const projects = buildProjectIndex(files, { includeArchived: this.state.includeArchived });
    if (!projects.length) { this.contentEl.setText('没有研究项目。'); return; }
    if (!projects.some((project) => project.path === this.projectPath)) this.projectPath = projects[0].path;
    this.state.projectPath = this.projectPath;
    this.snapshot = buildProjectSnapshot(files, this.projectPath, { includeArchived: this.state.includeArchived });
    this.render(files, projects);
  }
  private async setFrontmatter(path: string, mutate: (frontmatter: Record<string, unknown>) => void): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error(`Missing ${path}`);
    await this.app.fileManager.processFrontMatter(file, mutate);
  }
  private actions(): WorkbenchActions {
    return {
      selectProject: (path) => { this.projectPath = path; this.state.projectPath = path; void this.refresh(); },
      selectPanel: (panel) => { this.state.panel = panel; void this.refresh(); },
      setProblemFilter: (filter) => { this.state.problemFilter = filter; this.renderCurrent(); },
      setQuery: (query) => { this.state.query = query; this.renderCurrent(); },
      setFilters: (filters) => { this.state.status = filters.status ?? []; this.state.stage = filters.stage ?? []; this.state.researchRole = filters.researchRole ?? []; this.state.sources = filters.sources ?? []; this.state.includeArchived = (filters.__includeArchived ?? []).includes('true'); this.state.fullText = (filters.__fullText ?? []).includes('true'); this.renderCurrent(); },
      toggleFullText: (value) => { this.state.fullText = value; this.renderCurrent(); },
      openProjectNote: () => { this.state.panel = 'project-note'; void this.refresh(); },
      openProblem: (problem) => void this.openFile(problem.path),
      createProject: () => void this.openProjectWizard(), createProblem: () => void this.createProblem(), createTask: () => void this.createTask(), openTask: (path) => void this.openFile(path), editTask: (path) => void this.editTask(path),
      associateProblem: () => void this.associateProblem(), recordIdea: () => void this.createPending(),
      openGoals: () => { this.state.panel = 'goals'; void this.refresh(); }, openRecords: () => { this.state.panel = 'records'; void this.refresh(); }, openInbox: () => { this.state.panel = 'inbox'; void this.refresh(); },
      archive: (path) => void this.archive(path), edit: (path) => void this.editProblem(path),
      toggleFocus: (problem) => void this.toggleFocus(problem.path, problem.focus), openEvent: (event) => void this.openFile(event.path), openPending: (input) => void this.openFile(input.path), transitionPending: (input, status) => void this.transitionPending(input.path, status),
    };
  }
  private renderCurrent(): void { if (!this.snapshot) return; void this.files().then((files) => this.render(files, buildProjectIndex(files, { includeArchived: this.state.includeArchived }))); }
  private render(files: VaultFile[], projects = buildProjectIndex(files, { includeArchived: this.state.includeArchived })): void {
    if (!this.snapshot) return;
    if (this.state.panel === 'workspace') {
      renderWorkbench(this.contentEl, { state: this.state, projects, snapshot: this.snapshot, events: buildTimelineEvents(files, this.snapshot) }, this.actions());
      return;
    }
    this.contentEl.empty();
    const shell = this.contentEl.createDiv({ cls: `research-workbench rw-shell rw-density-${this.state.density}` });
    const header = shell.createDiv({ cls: 'rw-topbar' });
    header.createEl('strong', { text: '研究工作台' });
    const back = header.createEl('button', { cls: 'rw-button', text: '← 返回项目工作台' }); back.onclick = () => { this.state.panel = 'workspace'; void this.refresh(); };
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
  private async editProblem(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return;
    const cache = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    new EditProblemModal(this.app, { status: String(cache.status ?? 'exploring'), stage: String(cache.stage ?? 'inbox'), researchRole: String(cache.research_role ?? 'mainline') }, async (result) => { try { await writeFrontmatterWithExpectedHash(this.app, path, sha256(await this.app.vault.read(file)), (frontmatter) => { frontmatter.status = result.status; frontmatter.stage = result.stage; frontmatter.research_role = result.researchRole; }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open();
  }
  private async editGoals(): Promise<void> { if (!this.snapshot) return; const file = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(file instanceof TFile)) return; new EditGoalsModal(this.app, { currentGate: this.snapshot.project.currentGate ?? '', nextMilestone: this.snapshot.project.nextMilestone ?? '' }, async (result) => { try { await writeFrontmatterWithExpectedHash(this.app, this.projectPath, sha256(await this.app.vault.read(file)), (frontmatter) => { frontmatter.current_gate = result.currentGate; frontmatter.next_milestone = result.nextMilestone; }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open(); }
  private async editTask(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return; const cache = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}; new EditTaskModal(this.app, { status: String(cache.status ?? 'open'), priority: String(cache.priority ?? ''), due: String(cache.due ?? '') }, async (result) => { try { await updateTask(this.app, path, result, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open(); }
  private async associateProblem(): Promise<void> {
    const files = await this.files(); const current = new Set(this.snapshot?.problems.map((problem) => problem.path) ?? []);
    const candidates = files.filter((file) => file.path.startsWith('Spaces/Research/Problems/') && !current.has(file.path)).map((file) => ({ path: file.path, title: file.path.split('/').pop()?.replace(/\.md$/, '') ?? file.path }));
    new AssociateProblemModal(this.app, candidates, async (problemPath, focus) => { const project = this.app.vault.getAbstractFileByPath(this.projectPath); if (!(project instanceof TFile)) return; try { await linkExistingProblemToProject(this.app, this.projectPath, problemPath, { focus, expectedHash: sha256(await this.app.vault.read(project)) }); await this.refresh(); } catch (error) { new Notice(String(error)); } }).open();
  }
  async openProjectWizard(): Promise<void> {
    new ProjectWizard(this.app, async (result: ProjectWizardResult) => {
      const created = await createProjectBundle(this.app, result);
      this.projectPath = created.projectPath; this.state.projectPath = created.projectPath; await this.refresh(); await this.openFile(created.problemPath);
    }).open();
  }
  private async createProblem(): Promise<void> { new ProblemModal(this.app, async (result) => { if (!this.snapshot) return; const path = await createProblemForProject(this.app, this.projectPath, { title: result.title, question: result.question, status: 'inbox', stage: 'inbox', researchRole: 'mainline', focus: false }); await this.refresh(); await this.openFile(path); }).open(); }
  private async createTask(): Promise<void> { new TaskModal(this.app, async (title) => { const path = `Spaces/GTD/Tasks/${title.trim()}.md`; await this.app.vault.create(path, `---\nstatus: open\ntags: [task]\nprojects: ["[[${this.snapshot?.project.title ?? 'Project'}]]"]\n---\n# ${title.trim()}\n`); await this.refresh(); }).open(); }
  private async createPending(): Promise<void> { new PendingModal(this.app, async (text, source) => { const path = `Spaces/Research/Ideas/${Date.now()}-pending.md`; await this.app.vault.create(path, `---\ntype: idea\nproject: "[[${this.snapshot?.project.title ?? 'Project'}]]"\npending: true\nprocessing_status: pending\nsource: ${JSON.stringify(source)}\n---\n# Pending discussion\n\n${text}\n`); await this.refresh(); }).open(); }
  private async transitionPending(path: string, status: 'pending' | 'linked' | 'deferred' | 'reference'): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) return; try { await updatePendingInput(this.app, path, status, sha256(await this.app.vault.read(file))); await this.refresh(); } catch (error) { new Notice(String(error)); } }
}
