import { Plugin } from 'obsidian';
import { ResearchWorkbenchView, VIEW_TYPE_RESEARCH_WORKBENCH } from './ui/workbench-view';
import { DEFAULT_SETTINGS, ResearchWorkbenchSettingTab } from './ui/settings';
import type { ResearchWorkbenchSettings } from './ui/settings-model';
import { normalizeColumnPreferences, type ColumnPreferences } from './ui/column-layout';

export default class ResearchWorkbenchPlugin extends Plugin {
  settings: ResearchWorkbenchSettings = { ...DEFAULT_SETTINGS };
  private settingsWrite: Promise<void> = Promise.resolve();
  async onload(): Promise<void> {
    const loaded = await this.loadData() ?? {};
    this.settings = { ...DEFAULT_SETTINGS, ...loaded, columnLayout: normalizeColumnPreferences(loaded.columnLayout) };
    this.registerView(VIEW_TYPE_RESEARCH_WORKBENCH, (leaf) => new ResearchWorkbenchView(leaf, this.settings, { preferences: this.settings.columnLayout, save: value => this.saveColumnPreferences(value) }));
    this.addSettingTab(new ResearchWorkbenchSettingTab(this.app, this));
    this.addCommand({ id: 'open-workbench', name: 'Open workbench', callback: () => void this.activate() });
    this.addCommand({ id: 'create-project', name: 'Create project', callback: () => void this.withView((view) => view.openProjectWizard()) });
    this.addCommand({ id: 'create-problem', name: 'Create problem', callback: () => void this.withView((view) => view.createProblem()) });
    this.addCommand({ id: 'create-task', name: 'Create task', callback: () => void this.withView((view) => view.createTask()) });
    this.addCommand({ id: 'record-idea', name: 'Record idea', callback: () => void this.withView((view) => view.createPending()) });
    this.addCommand({ id: 'open-inbox', name: 'Open inbox', callback: () => void this.withView((view) => view.openGlobalInbox()) });
    this.addCommand({ id: 'reference-note', name: 'Add existing note to inbox', callback: () => void this.withView((view) => view.captureExistingNote()) });
  }
  private writeSettings(): Promise<void> {
    const value = JSON.parse(JSON.stringify(this.settings));
    this.settingsWrite = this.settingsWrite.catch(() => {}).then(() => this.saveData(value));
    return this.settingsWrite;
  }
  async saveSettings(): Promise<void> {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)) if (leaf.view instanceof ResearchWorkbenchView) {
      leaf.view.setDataScope(this.settings); leaf.view.setColumnPreferences(this.settings.columnLayout);
    }
    await this.writeSettings();
  }
  async saveColumnPreferences(value: ColumnPreferences): Promise<void> {
    this.settings.columnLayout = normalizeColumnPreferences(value);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)) if (leaf.view instanceof ResearchWorkbenchView) leaf.view.setColumnPreferences(this.settings.columnLayout);
    await this.writeSettings();
  }
  private async withView(action: (view: ResearchWorkbenchView) => Promise<void> | void): Promise<void> { await this.activate(); const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0]; if (leaf?.view instanceof ResearchWorkbenchView) await action(leaf.view); }
  private async activate(): Promise<void> { const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_WORKBENCH)[0] ?? this.app.workspace.getLeaf(true); await leaf.setViewState({ type: VIEW_TYPE_RESEARCH_WORKBENCH, active: true }); this.app.workspace.revealLeaf(leaf); }
}
