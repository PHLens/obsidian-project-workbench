import { describe, expect, it } from 'vitest';
import { mkdirSync, symlinkSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyUpdatePlan } from '../tools/cli/export-context';
import { sha256 } from '../tools/cli/export-context';
const root=resolve('test-vault'); const project='Projects/Demo Project.md';
describe('update safety',()=>{
 it('rejects nested vault roots and non-markdown paths',()=>{expect(()=>applyUpdatePlan(resolve('test-vault/nested'),[],false)).toThrow('isolated'); expect(()=>applyUpdatePlan(root,[{path:'Views/research-problems.base',expectedHash:'x',kind:'append',content:'x'}],false)).toThrow()});
 it('rejects symlink escapes',()=>{const link=resolve(root,'escape.md'); const outside=resolve('/tmp/research-workbench-outside.md'); writeFileSync(outside,'outside'); try{symlinkSync(outside,link); expect(()=>applyUpdatePlan(root,[{path:'escape.md',expectedHash:sha256('outside'),kind:'append',content:'bad'}],true)).toThrow();}finally{try{unlinkSync(link)}catch{}}});
 it('rejects symlinked parent directories',()=>{const dir=resolve(root,'escape-dir'); const outside=resolve('/tmp/research-workbench-outside-dir'); mkdirSync(outside,{recursive:true}); writeFileSync(resolve(outside,'x.md'),'outside'); try{symlinkSync(outside,dir,'dir'); expect(()=>applyUpdatePlan(root,[{path:'escape-dir/x.md',expectedHash:sha256('outside'),kind:'append',content:'bad'}],true)).toThrow();}finally{try{unlinkSync(dir)}catch{}}});
 it('applies --apply as a flag through the parser test fixture',()=>{expect(readFileSync(resolve(root,project),'utf8')).toContain('status: proposed')});
});
