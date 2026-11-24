import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventRef, WorkspaceLeaf } from 'obsidian';
import { createRefreshScheduler } from '../../src/ui/refresh-scheduler';
import { setupDom } from '../helpers/dom';
vi.mock('obsidian', async () => import('../helpers/obsidian-dom'));
import { interactiveVault } from '../helpers/interactive-vault';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
const project = '---\ntype: project\n---\n# P';
const scope = { projectDirectories:['Projects'],inputDirectories:['Inputs'] };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('refresh performance boundaries', () => {
  it('waits for a quiet interval instead of redrawing during every event burst', () => {
    vi.useFakeTimers(); const run=vi.fn(); const scheduler=createRefreshScheduler(run,100,500);
    scheduler.request(); vi.advanceTimersByTime(80); scheduler.request(); vi.advanceTimersByTime(80); scheduler.request();
    expect(run).not.toHaveBeenCalled(); vi.advanceTimersByTime(100); expect(run).toHaveBeenCalledTimes(1); scheduler.dispose();
  });
  it('bounds the delay during continuous changes', () => {
    vi.useFakeTimers(); const run=vi.fn(); const scheduler=createRefreshScheduler(run,100,300);
    for(let i=0;i<4;i++){scheduler.request();vi.advanceTimersByTime(75);}
    expect(run).toHaveBeenCalledTimes(1); scheduler.dispose();
  });
  it('defers hidden-view work and catches up when its leaf becomes active', async () => {
    setupDom(); vi.useFakeTimers(); const test=interactiveVault({'Projects/P.md':project});
    const workspaceEvents=new Map<string,(leaf?:unknown)=>void>();
    test.app.workspace.on=((event:string,handler:(leaf?:unknown)=>void)=>{workspaceEvents.set(event,handler);return {} as never;}) as unknown as typeof test.app.workspace.on;
    const leaf={app:test.app} as unknown as WorkspaceLeaf; const view=new ResearchWorkbenchView(leaf,scope); await view.onOpen();
    let shown=true; view.contentEl.isShown=()=>shown;
    test.read.mockClear(); const render=vi.spyOn(view as unknown as { render():void },'render'); render.mockClear();
    shown=false; test.contents.set('Projects/P.md',project+'\nChanged'); test.files.get('Projects/P.md')!.stat.mtime++;
    test.handlers.get('modify')!(test.files.get('Projects/P.md')!); await vi.advanceTimersByTimeAsync(1000);
    expect(test.read).not.toHaveBeenCalled(); expect(render).not.toHaveBeenCalled();
    shown=true; workspaceEvents.get('active-leaf-change')?.(leaf); await vi.runAllTimersAsync();
    expect(test.read).toHaveBeenCalledTimes(1); expect(render).toHaveBeenCalledTimes(1); view.onunload();
  });
  it('preserves typing focus and caret after a search redraw', async () => {
    const {browser}=setupDom(); vi.useFakeTimers(); const test=interactiveVault({'Projects/P.md':project});
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope); await view.onOpen();
    const input=document.querySelector<HTMLInputElement>('.rw-search')!; input.focus(); input.value='sample'; input.setSelectionRange(3,3); input.dispatchEvent(new browser.Event('input',{bubbles:true}) as unknown as Event);
    await vi.advanceTimersByTimeAsync(40);
    const current=document.querySelector<HTMLInputElement>('.rw-search')!;
    expect(document.activeElement).toBe(current); expect(current.selectionStart).toBe(3); expect(current.value).toBe('sample'); view.onunload();
  });
  it('cancels query work through the view-close lifecycle', async () => {
    const {browser}=setupDom(); vi.useFakeTimers(); const test=interactiveVault({'Projects/P.md':project});
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope); await view.onOpen();
    const render=vi.spyOn(view as unknown as {render():void},'render'); render.mockClear();
    const input=document.querySelector<HTMLInputElement>('.rw-search')!; input.value='a'; input.dispatchEvent(new browser.Event('input',{bubbles:true}) as unknown as Event);
    const close=(view as unknown as {onClose?:()=>Promise<void>}).onClose; if(close)await close.call(view);
    await vi.runAllTimersAsync(); expect(render).not.toHaveBeenCalled(); view.onunload();
  });
  it('starts a fresh load on reopen and rejects a late result from the closed view', async () => {
    setupDom(); const test=interactiveVault({'Projects/P.md':project});
    let finishOld: (text:string)=>void=()=>{}; const old=new Promise<string>(resolve=>{finishOld=resolve;});
    test.read.mockImplementationOnce(()=>old);
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);
    const first=view.onOpen(); await new Promise(resolve=>setTimeout(resolve,0));
    await view.onClose(); test.contents.set('Projects/P.md','---\ntype: project\ntitle: New version\n---\n# New');
    const second=view.onOpen(); await new Promise(resolve=>setTimeout(resolve,0));
    expect(test.read).toHaveBeenCalledTimes(2);
    finishOld(project); await Promise.all([first,second]);
    expect(document.querySelector('.rw-project-title-line h1')?.textContent).toBe('New version'); view.onunload();
  });

  it('keeps one subscription set per open view and removes it on close', async () => {
    setupDom(); const test=interactiveVault({'Projects/P.md':project}); const refs=new Set<EventRef>();
    test.app.vault.on=((name:string,callback:unknown)=>{const ref={name,callback} as unknown as EventRef;refs.add(ref);return ref;}) as unknown as typeof test.app.vault.on;
    test.app.vault.offref=(ref)=>{refs.delete(ref);};
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);
    await view.onOpen(); await view.onOpen(); expect(refs.size).toBe(4);
    await view.onClose(); expect(refs.size).toBe(0); await view.onOpen(); expect(refs.size).toBe(4); view.onunload(); expect(refs.size).toBe(0);
  });

  it('catches up after the document becomes visible again without a leaf switch', async () => {
    const {browser}=setupDom(); vi.useFakeTimers(); const test=interactiveVault({'Projects/P.md':project});
    let hidden=false; Object.defineProperty(document,'hidden',{get:()=>hidden,configurable:true});
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope); await view.onOpen(); test.read.mockClear();
    hidden=true; test.contents.set('Projects/P.md',project+'\nChange'); test.files.get('Projects/P.md')!.stat.mtime++;
    test.handlers.get('modify')!(test.files.get('Projects/P.md')!); await vi.advanceTimersByTimeAsync(1000); expect(test.read).not.toHaveBeenCalled();
    hidden=false; document.dispatchEvent(new browser.Event('visibilitychange') as unknown as Event); await vi.runAllTimersAsync();
    expect(test.read).toHaveBeenCalledTimes(1); view.onunload();
  });

  it('does not immediately repeat an in-flight load before the event burst has settled', async () => {
    setupDom(); vi.useFakeTimers(); const test=interactiveVault({'Projects/P.md':project});
    let finish:(text:string)=>void=()=>{}; const pending=new Promise<string>(resolve=>{finish=resolve;});test.read.mockImplementationOnce(()=>pending);
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);const opening=view.onOpen();
    test.handlers.get('modify')!(test.files.get('Projects/P.md')!);finish(project);await opening;
    expect(test.read).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(250);expect(test.read).toHaveBeenCalledTimes(2);view.onunload();
  });

  it('does not resurrect a forced stale cache entry after close and reopen', async () => {
    setupDom();const old='---\ntype: project\ntitle: Old\n---\n# P';const fresh=old.replace('Old','New');const test=interactiveVault({'Projects/P.md':old});
    const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);await view.onOpen();
    test.contents.set('Projects/P.md',fresh);let finish:(text:string)=>void=()=>{};const pending=new Promise<string>(resolve=>{finish=resolve;});test.read.mockImplementationOnce(()=>pending);
    test.handlers.get('modify')!(test.files.get('Projects/P.md')!);const forced=view.refresh();await new Promise(resolve=>setTimeout(resolve,0));
    await view.onClose();await view.onOpen();finish(fresh);await forced;
    expect(document.querySelector('.rw-project-title-line h1')?.textContent).toBe('New');view.onunload();
  });
  it('keeps an IME composition alive until the final search value is committed', async () => {
    const {browser}=setupDom();vi.useFakeTimers();const test=interactiveVault({'Projects/P.md':project});const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);await view.onOpen();
    const input=document.querySelector<HTMLInputElement>('.rw-search')!;input.focus();input.dispatchEvent(new browser.CompositionEvent('compositionstart',{bubbles:true}) as unknown as Event);input.value='pin';input.dispatchEvent(new browser.InputEvent('input',{bubbles:true,isComposing:true}) as unknown as Event);
    await vi.advanceTimersByTimeAsync(100);expect(document.querySelector('.rw-search')).toBe(input);
    input.value='拼音';input.dispatchEvent(new browser.CompositionEvent('compositionend',{bubbles:true}) as unknown as Event);await vi.advanceTimersByTimeAsync(40);
    expect(document.querySelector<HTMLInputElement>('.rw-search')?.value).toBe('拼音');expect(document.activeElement).toBe(document.querySelector('.rw-search'));view.onunload();
  });
  it('defers a vault-driven redraw while IME composition is active', async () => {
    const {browser}=setupDom();const test=interactiveVault({'Projects/P.md':project});const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,scope);await view.onOpen();
    const input=document.querySelector<HTMLInputElement>('.rw-search')!;input.focus();input.dispatchEvent(new browser.CompositionEvent('compositionstart',{bubbles:true}) as unknown as Event);
    await test.app.vault.modify(test.files.get('Projects/P.md')! as never,'---\ntype: project\ntitle: Updated\n---\n# P');await view.refresh();
    expect(document.querySelector('.rw-search')).toBe(input);input.value='';input.dispatchEvent(new browser.CompositionEvent('compositionend',{bubbles:true}) as unknown as Event);await new Promise(resolve=>setTimeout(resolve,60));
    expect(document.querySelector('.rw-project-title-line h1')?.textContent).toBe('Updated');view.onunload();
  });

});
