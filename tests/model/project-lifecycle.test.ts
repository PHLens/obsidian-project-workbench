import { describe, expect, it } from 'vitest';
import { buildProjectIndex, buildProjectSnapshot } from '../../src/model/project-snapshot';
import type { VaultFile } from '../../src/model/types';
const file=(path:string,content:string):VaultFile=>({path,content});
const empty=file('Projects/Empty.md','---\ntype: project\ntitle: Empty\nstatus: proposed\n---\n# Empty\n\n## Research Question\n');
const newProject=file('Projects/New.md','---\ntype: project\ntitle: New\nstatus: proposed\nproblems: ["[[First question]]"]\nfocus_problems: ["[[First question]]"]\n---\n# New\n\n## Goal\nBuild a reliable migration method.');
const first=file('Problems/First question.md','---\ntype: problem\nup: "[[New]]"\nstatus: inbox\n---\n# First question\n\n## Overview\nWhat must be learned?');
const unrelated=file('Records/2026-11-22.md','## Research\n\nA note about unrelated thing.');
describe('project lifecycle model',()=>{
 it('indexes projects in both project roots',()=>expect(buildProjectIndex([empty,file('Other Projects/Legacy.md','---\ntype: project\n---\n')]).map(x=>x.path)).toEqual(['Other Projects/Legacy.md','Projects/Empty.md']));
 it('shows a newly created project with its first problem and focus',()=>{const s=buildProjectSnapshot([newProject,first],newProject.path);expect(s.problems.map(p=>p.title)).toEqual(['First question']);expect(s.focusProblemPaths).toEqual([first.path]);expect(s.project.goal).toContain('Build a reliable');});
 it('does not include unrelated daily records',()=>{const s=buildProjectSnapshot([newProject,first,unrelated],newProject.path);expect(s.records).toEqual([])});
});
