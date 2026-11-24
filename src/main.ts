import { Plugin } from 'obsidian';
import { ResearchWorkbenchView, VIEW_TYPE_RESEARCH_WORKBENCH } from './ui/workbench-view';
import { DEFAULT_SETTINGS, ResearchWorkbenchSettingTab } from './ui/settings';
import type { ResearchWorkbenchSettings } from './ui/settings-model';

export default class ResearchWorkbenchPlugin extends Plugin {
  settings: ResearchWorkbenchSettings = { ...DEFAULT_SETTINGS };
  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData() ?? {}) };
    this.registerView(VIEW_TYPE_RESEARCH_WORKBENCH, (leaf) => new ResearchWorkbenchView(leaf, this.settings));
    this.addSettingTab(new ResearchWorkbenchSettingTab(this.app, this));
    this.addCommand({ id: 'open-workbench', name: 'Open workbench', callback: () => void this.activate() });
    this.addCommand({ id: 'create-project', name: 'Create project', callback: () => void this.withView((view) => view.openProjectWizard()) });
    this.addCommand({ id: 'create-problem', name: 'Create problem', callback: () => void this.withView((view) => view.createProblem()) });
    this.addCommand({ id: 'create-task', name: 'Create task', callback: () => void this.withView((view) => view.createTask()) });
    this.addCommand({ id: 'record-idea', name: 'Record idea', callback: () => void this.withView((view) => view.createPending()) });
    this.addCommand({ id: 'open-inbox', name: 'Open inbox', callback: () => void this.withView((view) => view.openGlobalInbox()) });
    this.addCommand({ id: 'reference-note', name: 'Add existing note to inbox', callback: () => void this.withView((view) => view.captureExistingNote()) });
  }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)) if (leaf.view instanceof ResearchWorkbenchView) leaf.view.setDataScope(this.settings); }
  private async withView(action: (view: ResearchWorkbenchView) => Promise<void> | void): Promise<void> { await this.activate(); const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0]; if (leaf?.view instanceof ResearchWorkbenchView) await action(leaf.view); }
  private async activate(): Promise<void> { const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0] ?? this.app.workspace.getLeaf(true); await leaf.setViewState({ type: VIEW_TYPE_RESEARCH_WORKBENCH, active: true }); this.app.workspace.revealLeaf(leaf); }
}
