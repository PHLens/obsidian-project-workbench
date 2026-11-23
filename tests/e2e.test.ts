import {describe,it,expect} from 'vitest'; import {exportProjectContext} from '../tools/cli/export-context';
describe('test vault workflow',()=>{it('exports Demo Project context without formal vault access',()=>{const c=exportProjectContext(resolve('test-vault'),'Spaces/Research/Projects/Demo Project.md');expect(c.snapshot.problems.length).toBe(2);expect(c.vault.endsWith('test-vault')).toBe(true);});});
function resolve(p:string){return new URL(`file://${process.cwd()}/${p}`).pathname}
