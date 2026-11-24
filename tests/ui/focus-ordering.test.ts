import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import { parse } from 'yaml';
import { setupDom, flushUi } from '../helpers/dom';
vi.mock('obsidian',async()=>import('../helpers/obsidian-dom'));
import { renderProblemTable } from '../../src/ui/components/problem-table';
import { ResearchWorkbenchView } from '../../src/ui/workbench-view';
import { interactiveVault } from '../helpers/interactive-vault';
import { DEFAULT_WORKBENCH_STATE } from '../../src/model/view-state';
import type { ProblemSummary, ProjectSnapshot } from '../../src/model/types';
import type { WorkbenchActions } from '../../src/ui/components/workbench-shell';
afterEach(()=>vi.unstubAllGlobals());
const problem=(title:string,focus:boolean):ProblemSummary=>({path:`Problems/${title}.md`,title,focus,nextSteps:[],source:{path:`Problems/${title}.md`,kind:'problem'}});
const snapshot=(problems:ProblemSummary[]):ProjectSnapshot=>({schemaVersion:1,project:{path:'Projects/P.md',title:'P',source:{path:'Projects/P.md',kind:'project'}},problems,focusProblemPaths:problems.filter(p=>p.focus).map(p=>p.path),tasks:[],pendingInputs:[],records:[],generatedAt:'snapshot'});
const actions=new Proxy({},{get:()=>()=>{}}) as WorkbenchActions;
const titles=(root:HTMLElement)=>Array.from(root.querySelectorAll('.rw-problem-identity > strong')).map(el=>el.textContent);

describe('Focus-first problem display',()=>{
 it('stably puts Focus entries first without reordering the input snapshot',()=>{
  const {root}=setupDom();const model=snapshot([problem('Other A',false),problem('Focus B',true),problem('Other C',false),problem('Focus D',true)]);
  renderProblemTable(root,model,{...DEFAULT_WORKBENCH_STATE,projectPath:model.project.path},actions);
  expect(titles(root)).toEqual(['Focus B','Focus D','Other A','Other C']);expect(model.problems.map(p=>p.title)).toEqual(['Other A','Focus B','Other C','Focus D']);
 });
 it('keeps focused subset ordering stable',()=>{
  const {root}=setupDom();const model=snapshot([problem('Other',false),problem('Focus A',true),problem('Focus B',true)]);
  renderProblemTable(root,model,{...DEFAULT_WORKBENCH_STATE,projectPath:model.project.path,problemFilter:'focus'},actions);
  expect(titles(root)).toEqual(['Focus A','Focus B']);
 });
 it('removes a full-path Focus link and adds it back without duplicate aliases',async()=>{
  setupDom();const raw='---\ntype: project\nproblems: ["[[Problems/A.md]]","[[Problems/B.md]]"]\nfocus_problems: ["[[Problems/B.md]]"]\n---\n# P';
  const test=interactiveVault({'Projects/P.md':raw,'Problems/A.md':'---\ntype: problem\n---\n# A','Problems/B.md':'---\ntype: problem\n---\n# B'});
  const view=new ResearchWorkbenchView({app:test.app} as unknown as WorkspaceLeaf,{projectDirectories:['Projects'],problemDirectories:['Problems']});await view.onOpen();
  (document.querySelector('.rw-problem-row.is-focus [aria-label="取消焦点"]') as HTMLElement).click();await flushUi();await flushUi();
  expect(parse(test.contents.get('Projects/P.md')!.match(/^---\n([\s\S]*?)\n---/)![1]).focus_problems).toEqual([]);
  const row=Array.from(document.querySelectorAll<HTMLElement>('.rw-problem-row')).find(el=>el.querySelector('strong')?.textContent==='B')!;
  row.querySelector<HTMLButtonElement>('[aria-label="设为焦点"]')!.click();await flushUi();await flushUi();
  expect(titles(document.body)[0]).toBe('B');
  expect(parse(test.contents.get('Projects/P.md')!.match(/^---\n([\s\S]*?)\n---/)![1]).focus_problems).toEqual(['[[Problems/B.md]]']);view.onunload();
 });
});
