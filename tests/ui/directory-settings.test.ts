import { describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import type { ResearchWorkbenchSettings } from '../../src/ui/settings-model';

const callbacks = vi.hoisted(() => new Map<string, (value: string) => Promise<void>>());
vi.mock('obsidian', () => ({
  PluginSettingTab: class { containerEl = { empty() {} }; },
  Setting: class {
    name = '';
    setName(name: string) { this.name = name; return this; }
    setDesc() { return this; }
    setHeading() { return this; }
    addDropdown() { return this; }
    addText(build: (text: unknown) => void) {
      const component = {
        setValue() { return component; },
        onChange: (callback: (value: string) => Promise<void>) => { callbacks.set(this.name, callback); return component; },
      };
      build(component);
      return this;
    }
  },
}));

import { ResearchWorkbenchSettingTab } from '../../src/ui/settings';
import { DEFAULT_SETTINGS } from '../../src/ui/settings-model';

describe('directory settings', () => {
  it('lets every data category be disabled by clearing its directory list', async () => {
    const settings = { ...DEFAULT_SETTINGS, projectDirectories: ['Projects'], problemDirectories: ['Problems'], taskDirectories: ['Tasks'], inputDirectories: ['Inputs'], recordDirectories: ['Records'] };
    const saveSettings = vi.fn(async () => {});
    const plugin = { settings, saveSettings } as unknown as Plugin & { settings: ResearchWorkbenchSettings; saveSettings(): Promise<void> };
    new ResearchWorkbenchSettingTab({} as App, plugin).display();
    for (const label of ['项目目录', '问题目录', '任务目录', '待讨论输入目录', '进展记录目录']) {
      await callbacks.get(label)!('');
    }
    expect(settings).toMatchObject({ projectDirectories: [], problemDirectories: [], taskDirectories: [], inputDirectories: [], recordDirectories: [] });
    expect(saveSettings).toHaveBeenCalledTimes(5);
  });
});
