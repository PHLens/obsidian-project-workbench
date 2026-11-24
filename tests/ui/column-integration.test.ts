import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import { setupDom, flushUi } from '../helpers/dom';
import { interactiveVault } from '../helpers/interactive-vault';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
import { normalizeColumnPreferences } from '../../src/ui/column-layout';
import * as snapshots from '../../src/model/project-snapshot';

const scope={projectDirectories:['Projects'],problemDirectories:['Problems'],inputDirectories:['Inputs']};
const project='---\ntype: project\nproblems: ["[[Problems/Q.md]]"]\n---\n# P';
const problem='---\ntype: problem\nstatus: exploring\n---\n# Q\n\n## Next Step\n\n- [ ] A';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function environment() {
  const dom=setupDom();
  vi.spyOn(dom.browser.HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(new dom.browser.DOMRect(0,0,1200,800));
  const vault=interactiveVault({'Projects/P.md':project,'Problems/Q.md':problem});
  return {...dom,...vault};
}
describe('column preferences in the real workbench',()=>{
  it('keeps note data, card nodes, search composition, and property drafts while changing geometry',async()=>{
    const t=environment();let stored=normalizeColumnPreferences();
    const view=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope,{preferences:stored,save:async value=>{stored=value;}});
    await view.onOpen();
    const root=document.querySelector<HTMLElement>('.research-workbench')!;
    const card=root.querySelector('.rw-problem-row'),search=root.querySelector<HTMLInputElement>('.rw-search')!;
    const toggle=root.querySelector<HTMLButtonElement>('[data-column-toggle="left"]');
    expect(toggle).not.toBeNull();
    (root.querySelector('[aria-label^="编辑问题状态"]') as HTMLElement ?? root.querySelector('.rw-status') as HTMLElement).click();await flushUi();
    const draft=document.querySelector<HTMLInputElement>('.rw-property-editor input')!;draft.value='draft status';t.read.mockClear();
    const builds=vi.spyOn(snapshots,'buildProjectSnapshot');
    const handle=root.querySelector<HTMLElement>('[data-column-resize="left"]')!;
    handle.dispatchEvent(new t.browser.PointerEvent('pointerdown',{clientX:100,pointerId:1,button:0,bubbles:true}) as unknown as Event);
    handle.dispatchEvent(new t.browser.PointerEvent('pointermove',{clientX:130,pointerId:1,bubbles:true}) as unknown as Event);
    handle.dispatchEvent(new t.browser.PointerEvent('pointerup',{clientX:130,pointerId:1,bubbles:true}) as unknown as Event);
    expect(document.querySelector('.rw-property-editor input')).toBe(draft);expect(draft.value).toBe('draft status');
    search.dispatchEvent(new t.browser.CompositionEvent('compositionstart',{bubbles:true}) as unknown as Event);
    toggle!.click();await flushUi();
    expect(root.querySelector('.rw-problem-row')).toBe(card);expect(root.querySelector('.rw-search')).toBe(search);
    expect(search.dataset.composing).toBe('true');expect(t.read).not.toHaveBeenCalled();expect(t.modify).not.toHaveBeenCalled();
    expect(builds).not.toHaveBeenCalled();
    expect(stored).toMatchObject({leftWidth:250,leftCollapsed:true});
    view.onunload();
    const restored=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope,{preferences:stored});
    await restored.onOpen();expect(document.querySelectorAll<HTMLElement>('.rw-sidebar')[1].hidden).toBe(true);restored.onunload();
  });
  it('updates another view without rereads and omits a context toggle on the Inbox panel',async()=>{
    const t=environment();const first=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope);
    const second=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope);await first.onOpen();await second.onOpen();t.read.mockClear();
    second.setColumnPreferences(normalizeColumnPreferences({rightCollapsed:true,leftWidth:260}));
    const roots=document.querySelectorAll<HTMLElement>('.research-workbench');
    expect(roots[1].style.getPropertyValue('--rw-left-width')).toBe('260px');
    expect(roots[1].querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(true);expect(t.read).not.toHaveBeenCalled();
    (Array.from(roots[0].querySelectorAll('button')).find(button=>button.textContent?.includes('收件箱')) as HTMLElement).click();
    expect(first.contentEl.querySelector('.research-workbench')?.getAttribute('data-panel')).toBe('inbox');
    expect(first.contentEl.querySelector('[data-column-toggle="right"]')).toBeNull();
    first.onunload();second.onunload();
  });
  it('releases a pending drag before a root is replaced or the view closes',async()=>{
    const t=environment();const save=vi.fn();
    const view=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope,{save});await view.onOpen();
    const handle=view.contentEl.querySelector<HTMLElement>('[data-column-resize="left"]')!;
    const pointer=(el:HTMLElement,type:string,x:number)=>el.dispatchEvent(new t.browser.PointerEvent(type,{clientX:x,pointerId:1,button:0,bubbles:true}) as unknown as Event);
    pointer(handle,'pointerdown',100);pointer(handle,'pointermove',130);
    await view.refresh();pointer(handle,'pointerup',130);await flushUi();expect(save).not.toHaveBeenCalled();
    const replacement=view.contentEl.querySelector<HTMLElement>('[data-column-resize="left"]')!;
    pointer(replacement,'pointerdown',100);pointer(replacement,'pointermove',140);view.onunload();pointer(replacement,'pointerup',140);
    await flushUi();expect(save).not.toHaveBeenCalled();
  });
});
