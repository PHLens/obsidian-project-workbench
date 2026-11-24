import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';
import type { ResearchWorkbenchSettings } from './settings-model';
import { DEFAULT_SETTINGS, normalizeDirectoryList } from './settings-model';
export { DEFAULT_SETTINGS } from './settings-model';
import type { WorkbenchDensity } from '../model/view-state';
export class ResearchWorkbenchSettingTab extends PluginSettingTab {
  private readonly workbenchPlugin: Plugin & { settings: ResearchWorkbenchSettings; saveSettings: () => Promise<void> };
  constructor(app: App, plugin: Plugin & { settings: ResearchWorkbenchSettings; saveSettings: () => Promise<void> }) { super(app, plugin); this.workbenchPlugin = plugin; }
  display(): void {
    const plugin = this.workbenchPlugin; this.containerEl.empty(); new Setting(this.containerEl).setName('Appearance').setHeading();
    new Setting(this.containerEl).setName('信息密度').addDropdown((dropdown) => dropdown.addOptions({ comfortable: '舒适', standard: '标准', compact: '紧凑' }).setValue(plugin.settings.density).onChange(async (value) => { plugin.settings.density = value as WorkbenchDensity; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('强调色').addDropdown((dropdown) => dropdown.addOptions({ theme: '跟随 Obsidian', indigo: '靛紫' }).setValue(plugin.settings.accentMode).onChange(async (value) => { plugin.settings.accentMode = value as ResearchWorkbenchSettings['accentMode']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('标签显示').addDropdown((dropdown) => dropdown.addOptions({ full: '完整', compact: '紧凑', icon: '只显示图标' }).setValue(plugin.settings.tagMode).onChange(async (value) => { plugin.settings.tagMode = value as ResearchWorkbenchSettings['tagMode']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('图标风格').addDropdown((dropdown) => dropdown.addOptions({ linear: '线性', solid: '实心' }).setValue(plugin.settings.iconStyle).onChange(async (value) => { plugin.settings.iconStyle = value as ResearchWorkbenchSettings['iconStyle']; await plugin.saveSettings(); }));
    new Setting(this.containerEl).setName('Data scope').setHeading();
    const directorySetting = (name: string, description: string, key: keyof Pick<ResearchWorkbenchSettings, 'projectDirectories' | 'problemDirectories' | 'taskDirectories' | 'inputDirectories' | 'recordDirectories'>): void => {
      new Setting(this.containerEl).setName(name).setDesc(description).addText((text) => text.setValue(plugin.settings[key].join(', ')).onChange(async (value) => { const directories = normalizeDirectoryList(value); plugin.settings[key] = directories; await plugin.saveSettings(); }));
    };
    directorySetting('项目目录', '只读取和监听这些目录中的项目 Markdown。多个目录用逗号分隔。', 'projectDirectories');
    directorySetting('问题目录', '只读取这些目录中的研究问题。', 'problemDirectories');
    directorySetting('任务目录', '只读取这些目录中的任务。', 'taskDirectories');
    directorySetting('待讨论输入目录', '只读取这些目录中的收件箱输入。', 'inputDirectories');
    directorySetting('进展记录目录', '只读取这些目录中的日期记录。', 'recordDirectories');
  }
}
