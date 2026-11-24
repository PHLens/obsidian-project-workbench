import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PluginManifest, WorkspaceLeaf } from 'obsidian';
import { setupDom, flushUi } from '../helpers/dom';
import { interactiveVault } from '../helpers/interactive-vault';
import { normalizeColumnPreferences } from '../../src/ui/column-layout';
const io=vi.hoisted(()=>({writes:[] as any[],complete:[] as Array<()=>void>,stored:null as any}));
vi.mock('obsidian',async()=>{
  const runtime=await import('../helpers/obsidian-dom');
  return {...runtime,Plugin:class {
    constructor(public app:any){}
    saveData(value:any){io.writes.push(value);return new Promise<void>(resolve=>{io.complete.push(()=>{io.stored=JSON.parse(JSON.stringify(value));resolve();});});}
  },PluginSettingTab:class{}};
});
import ResearchWorkbenchPlugin from '../../src/main';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
afterEach(()=>{vi.unstubAllGlobals();io.writes.length=0;io.complete.length=0;io.stored=null;});
describe('column settings persistence',()=>{
  it('propagates one layout change to both real views without refreshing notes',async()=>{
    const dom=setupDom();
    vi.spyOn(dom.browser.HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(new dom.browser.DOMRect(0,0,1200,800));
    const t=interactiveVault({'Projects/P.md':'---\ntype: project\n---\n# P'});
    const scope={projectDirectories:['Projects']};
    const first=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope),second=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope);
    await first.onOpen();await second.onOpen();t.read.mockClear();
    Object.assign(t.app.workspace,{getLeavesOfType:()=>[{view:first},{view:second}]});
    const plugin=new ResearchWorkbenchPlugin(t.app,{} as PluginManifest);
    const saving=plugin.saveColumnPreferences(normalizeColumnPreferences({leftWidth:270,rightCollapsed:true}));await flushUi();
    for(const view of [first,second])expect(view.contentEl.querySelector<HTMLElement>('.research-workbench')!.style.getPropertyValue('--rw-left-width')).toBe('270px');
    expect(t.read).not.toHaveBeenCalled();expect(io.writes).toHaveLength(1);
    io.complete.shift()!();await saving;first.onunload();second.onunload();
  });
  it('serializes overlapping writes and retains directory settings in the final saved data',async()=>{
    setupDom();const t=interactiveVault({});
    Object.assign(t.app.workspace,{getLeavesOfType:()=>[]});
    const plugin=new ResearchWorkbenchPlugin(t.app,{} as PluginManifest);
    plugin.settings.projectDirectories=['Projects'];
    const first=plugin.saveColumnPreferences(normalizeColumnPreferences({leftWidth:240}));await flushUi();
    plugin.settings.problemDirectories=['Questions'];
    const second=plugin.saveColumnPreferences(normalizeColumnPreferences({leftWidth:260,rightCollapsed:true}));await flushUi();
    expect(io.writes).toHaveLength(1);
    io.complete.shift()!();await first;await flushUi();
    expect(io.writes).toHaveLength(2);io.complete.shift()!();await second;
    expect(io.stored).toMatchObject({projectDirectories:['Projects'],problemDirectories:['Questions'],columnLayout:{leftWidth:260,rightCollapsed:true}});
  });
});
