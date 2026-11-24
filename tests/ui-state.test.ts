import { describe, expect, it } from 'vitest';
import { buildProjectSnapshot, type VaultFile } from '../src/model/project-snapshot';
const files: VaultFile[] = [
{path:'Projects/Demo Project.md',content:'---\ntype: project\nproblems: ["[[P1]]", "[[P2]]"]\nfocus_problems: ["[[P1]]"]\n---\nGoal'},
{path:'Problems/P1.md',content:'---\ntype: problem\nstatus: exploring\n---\n# P1\n## Next Step\n- [ ] Do P1'},
{path:'Problems/P2.md',content:'---\ntype: problem\nstatus: exploring\n---\n# P2'},
];
describe('workbench state',()=>{it('orders all problems and focus subset',()=>{const s=buildProjectSnapshot(files,'Projects/Demo Project.md');expect(s.problems).toHaveLength(2);expect(s.problems.filter(p=>p.focus).map(p=>p.title)).toEqual(['P1'])})});
