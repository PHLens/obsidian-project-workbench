import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';
import type { ResearchWorkbenchSettings } from './settings-model';
import { DEFAULT_SETTINGS } from './settings-model';
export { DEFAULT_SETTINGS } from './settings-model';
import type { WorkbenchDensity } from '../model/view-state';
export class ResearchWorkbenchSettingTab extends PluginSettingTab {
  private readonly workbenchPlugin: Plugin & { settings: ResearchWorkbenchSettings; saveSettings: () => Promise<void> };
  constructor(app: App, plugin: Plugin & { settings: ResearchWorkbenchSettings; saveSettings: () => Promise<void> }) { super(app, plugin); this.workbenchPlugin = plugin; }
  display(): void {
    const plugin = this.workbenchPlugin; this.containerEl.empty(); this.containerEl.createEl('h2', { text: 'Project Workbench' });
    new Setting(this.containerEl).setName('信息密度').addDropdown((dropdown) => dropdown.addOptions({ comfortable: '舒适', standard: '标准', compact: '紧凑' }).setValue(plugin.settings.density).onChange(async (value) => { plugin.settings.density = value as WorkbenchDensity; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('强调色').addDropdown((dropdown) => dropdown.addOptions({ theme: '跟随 Obsidian', indigo: '靛紫' }).setValue(plugin.settings.accentMode).onChange(async (value) => { plugin.settings.accentMode = value as ResearchWorkbenchSettings['accentMode']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('标签显示').addDropdown((dropdown) => dropdown.addOptions({ full: '完整', compact: '紧凑', icon: '只显示图标' }).setValue(plugin.settings.tagMode).onChange(async (value) => { plugin.settings.tagMode = value as ResearchWorkbenchSettings['tagMode']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('右栏').addDropdown((dropdown) => dropdown.addOptions({ fixed: '固定', collapsible: '可折叠', stacked: '窄屏堆叠' }).setValue(plugin.settings.rightRail).onChange(async (value) => { plugin.settings.rightRail = value as ResearchWorkbenchSettings['rightRail']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('图标风格').addDropdown((dropdown) => dropdown.addOptions({ linear: '线性', solid: '实心' }).setValue(plugin.settings.iconStyle).onChange(async (value) => { plugin.settings.iconStyle = value as ResearchWorkbenchSettings['iconStyle']; await plugin.saveSettings(); }));
  }
}
