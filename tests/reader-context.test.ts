import { describe, expect, it } from 'vitest'; import { readerContext } from '../src/ui/reader-context';
const snapshot:any={problems:[{path:'P.md',title:'P',focus:true,status:'exploring',nextSteps:[],source:{path:'P.md',kind:'problem'}}],tasks:[],pendingInputs:[],records:[],focusProblemPaths:['P.md'],project:{},schemaVersion:1,generatedAt:''};
describe('reader context',()=>{it('returns selected problem context',()=>expect(readerContext(snapshot,'P.md').problem.title).toBe('P'));});
