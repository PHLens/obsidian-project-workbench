import { describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import type { ResearchWorkbenchSettings } from '../../src/ui/settings-model';
import { DEFAULT_SETTINGS } from '../../src/ui/settings-model';

const captured = vi.hoisted(() => ({ names: [] as string[], values: new Map<string, string>(), callbacks: new Map<string, (value: string) => Promise<void>>() }));
vi.mock('obsidian', () => ({
  PluginSettingTab: class { containerEl = { empty() {} }; },
  Setting: class {
    name = '';
    setName(name: string) { this.name = name; captured.names.push(name); return this; }
    setDesc() { return this; }
    setHeading() { return this; }
    addDropdown() { return this; }
    addText(build: (text: any) => void) {
      const key = this.name;
      const component = { setValue(value: string) { captured.values.set(key, value); return component; }, onChange(callback: (value: string) => Promise<void>) { captured.callbacks.set(key, callback); return component; } };
      build(component); return this;
    }
  },
}));
import { ResearchWorkbenchSettingTab } from '../../src/ui/settings';

describe('template path settings', () => {
  it('shows six template fields and saves normalized paths without touching data scope', async () => {
    captured.names.length = 0; captured.values.clear(); captured.callbacks.clear();
    const settings = { ...DEFAULT_SETTINGS, projectDirectories: ['Projects'], templatePaths: { ...DEFAULT_SETTINGS.templatePaths } };
    const saveSettings = vi.fn(async () => {});
    new ResearchWorkbenchSettingTab({} as App, { settings, saveSettings } as unknown as Plugin & { settings: ResearchWorkbenchSettings; saveSettings(): Promise<void> }).display();
    expect(captured.names).toContain('Templates');
    for (const label of ['项目模板', '问题模板', '任务模板', '论文模板', '想法模板', '笔记模板']) expect(captured.names).toContain(label);
    await captured.callbacks.get('项目模板')!(' Templates/project.md ');
    expect(settings.templatePaths.project).toBe('Templates/project.md');
    expect(settings.projectDirectories).toEqual(['Projects']);
    expect(saveSettings).toHaveBeenCalledTimes(1);
  });
});
