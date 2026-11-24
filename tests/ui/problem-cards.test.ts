import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import type { ProblemSummary } from '../../src/model/types';
import type { WorkbenchActions } from '../../src/ui/components/workbench-shell';
import { setupDom, flushUi } from '../helpers/dom';
import { interactiveVault } from '../helpers/interactive-vault';
vi.mock('obsidian',async()=>import('../helpers/obsidian-dom'));
import { renderProblemRow } from '../../src/ui/components/problem-row';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
const problem:ProblemSummary={path:'Problems/Q.md',title:'Question',focus:true,summary:'Independent overview',status:'exploring',nextSteps:['First','Finished','Third','Fourth','Fifth'],nextStepItems:[
 {text:'First',completed:false,depth:0,line:5},{text:'Finished',completed:true,depth:1,line:6},{text:'Third',completed:false,depth:0,line:7},{text:'Fourth',depth:0,line:8},{text:'Fifth',completed:false,depth:0,line:9},
],source:{path:'Problems/Q.md',kind:'problem'}};
const scope={projectDirectories:['Projects'],problemDirectories:['Problems']};
const project='---\ntype: project\nproblems: ["[[Problems/Q.md]]"]\n---\n# P';
const raw='---\ntype: problem\n---\n# Q\n\n## Overview\n\nIndependent overview\n\n## Next Step\n\n- [ ] First\n- [x] Finished\n- [ ] Third\n- [ ] Fourth\n- [ ] Fifth';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function actionSpies() {
 const spies:Record<string,ReturnType<typeof vi.fn>>={};
 return new Proxy({}, {get:(_target,key:string)=>spies[key]??(spies[key]=vi.fn())}) as WorkbenchActions;
}
function visibleSteps(root:HTMLElement) {return Array.from(root.querySelectorAll<HTMLElement>('.rw-next-step')).filter(el=>!el.hidden);}
describe('layered problem cards',()=>{
 it('separates overview and actions, preserves checklist state, and expands independently of note navigation',()=>{
  const {root}=setupDom();const actions=actionSpies();renderProblemRow(root,problem,actions,false);
  expect(root.querySelector('.rw-problem-summary')?.textContent).toBe('Independent overview');
  expect(visibleSteps(root).map(el=>el.textContent)).toEqual(['First','Finished','Third']);
  const checkboxes=root.querySelectorAll<HTMLInputElement>('.rw-next-step input');
  expect(checkboxes[1].checked).toBe(true);expect(Array.from(checkboxes).every(el=>el.disabled)).toBe(true);
  const toggle=root.querySelector<HTMLButtonElement>('[data-action="toggle-next-steps"]')!;toggle.click();
  expect(visibleSteps(root)).toHaveLength(5);expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(actions.setNextStepsExpanded).toHaveBeenCalledWith(problem.path,true);expect(actions.openProblem).not.toHaveBeenCalled();
  toggle.click();expect(visibleSteps(root)).toHaveLength(3);
 });
 it('opens the title explicitly while retaining text selection and independent property/source actions',()=>{
  const {root}=setupDom();const actions=actionSpies();renderProblemRow(root,problem,actions);
  (root.querySelector('.rw-problem-summary') as HTMLElement).click();expect(actions.openProblem).not.toHaveBeenCalled();
  (root.querySelector('.rw-problem-title') as HTMLElement).click();expect(actions.openProblem).toHaveBeenCalledOnce();
  (root.querySelector('[data-field=status]') as HTMLElement).click();expect(actions.editProperty).toHaveBeenCalledOnce();
  (root.querySelector('[data-action=open-next-steps]') as HTMLElement).click();expect(actions.openNextSteps).toHaveBeenCalledWith(problem);
 });
 it('keeps an empty-list source entry without inventing steps or duplicating an action as the overview',()=>{
  const {root}=setupDom();renderProblemRow(root,{...problem,nextSteps:[],nextStepItems:[],summary:undefined},actionSpies());
  expect(root.querySelector('.rw-next-steps-empty')?.textContent).toContain('下一步');
  expect(root.querySelectorAll('.rw-next-step')).toHaveLength(0);
  expect(root.querySelector('[data-action=open-next-steps]')).not.toBeNull();
 });
 it('retains expansion on refresh and releases it for project changes and deleted problems',async()=>{
  setupDom();const t=interactiveVault({'Projects/P.md':project,'Projects/R.md':project.replace('# P','# R'),'Problems/Q.md':raw});
  const view=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope);await view.onOpen();
  const toggle=()=>view.contentEl.querySelector<HTMLButtonElement>('[data-action=toggle-next-steps]')!;
  t.read.mockClear();toggle().click();expect(visibleSteps(view.contentEl)).toHaveLength(5);expect(t.read).not.toHaveBeenCalled();
  await view.refresh();expect(toggle().getAttribute('aria-expanded')).toBe('true');
  const other=Array.from(view.contentEl.querySelectorAll<HTMLButtonElement>('.rw-project-choice')).find(el=>el.querySelector('.rw-project-choice-name')?.textContent==='R')!;other.click();
  expect(toggle().getAttribute('aria-expanded')).toBe('false');
  toggle().click();const file=t.files.get('Problems/Q.md')!;t.files.delete(file.path);await view.refresh();
  t.files.set(file.path,file);await view.refresh();expect(toggle().getAttribute('aria-expanded')).toBe('false');view.onunload();
 });
 it('opens the current Next Step heading through one targeted read, with a missing-heading fallback',async()=>{
  setupDom();const t=interactiveVault({'Projects/P.md':project,'Problems/Q.md':raw});
  const view=new ResearchWorkbenchView({app:t.app} as unknown as WorkspaceLeaf,scope);await view.onOpen();
  t.contents.set('Problems/Q.md','---\ntype: problem\n---\n# Q\n\nNew introduction.\n\n## Next Steps\n\n- [ ] Current action');
  t.read.mockClear();
  (view.contentEl.querySelector('[data-action=open-next-steps]') as HTMLElement).click();await flushUi();
  expect(t.read).toHaveBeenCalledTimes(1);
  expect(t.openFile).toHaveBeenLastCalledWith(t.files.get('Problems/Q.md'),{eState:{line:7}});
  t.contents.set('Problems/Q.md','---\ntype: problem\n---\n# Q\n\nNo section');t.read.mockClear();
  (view.contentEl.querySelector('[data-action=open-next-steps]') as HTMLElement).click();await flushUi();
  expect(t.openFile).toHaveBeenLastCalledWith(t.files.get('Problems/Q.md'));expect(t.read).toHaveBeenCalledTimes(1);view.onunload();
 });
});
