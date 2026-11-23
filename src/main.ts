import { Plugin } from 'obsidian';
import { ResearchWorkbenchView, VIEW_TYPE_RESEARCH_WORKBENCH } from './ui/workbench-view';
import { DEFAULT_SETTINGS, ResearchWorkbenchSettingTab } from './ui/settings';
import type { ResearchWorkbenchSettings } from './ui/settings-model';

export default class ResearchWorkbenchPlugin extends Plugin {
  settings: ResearchWorkbenchSettings = { ...DEFAULT_SETTINGS };
  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData() ?? {}) };
    this.registerView(VIEW_TYPE_RESEARCH_WORKBENCH, (leaf) => new ResearchWorkbenchView(leaf));
    this.addSettingTab(new ResearchWorkbenchSettingTab(this.app, this));
    this.addCommand({ id: 'open-research-workbench', name: 'Open project workbench', callback: () => this.activate() });
    this.addCommand({ id: 'create-research-project', name: 'Create project', callback: () => this.withView((view) => view.openProjectWizard()) });
    this.addCommand({ id: 'create-research-problem', name: 'Create problem', callback: () => this.withView((view) => (view as any).createProblem?.()) });
    this.addCommand({ id: 'create-research-task', name: 'Create task', callback: () => this.withView((view) => (view as any).createTask?.()) });
    this.addCommand({ id: 'record-research-idea', name: 'Record project idea', callback: () => this.withView((view) => (view as any).createPending?.()) });
  }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
  private async withView(action: (view: ResearchWorkbenchView) => Promise<void> | void): Promise<void> { await this.activate(); const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0]; if (leaf?.view instanceof ResearchWorkbenchView) await action(leaf.view); }
  private async activate(): Promise<void> { const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0] ?? this.app.workspace.getLeaf(true); await leaf.setViewState({ type: VIEW_TYPE_RESEARCH_WORKBENCH, active: true }); this.app.workspace.revealLeaf(leaf); }
}
