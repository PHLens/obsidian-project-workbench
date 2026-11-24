import type { ProjectSnapshot, ProblemSummary } from '../model/types';
import { resolveAssociationPath } from '../model/inbox';
export function readerContext(snapshot: ProjectSnapshot, problemPath: string) { const problem=snapshot.problems.find(p=>p.path===problemPath); if(!problem) throw new Error('Problem not found'); return {problem, tasks:snapshot.tasks.filter(t=>t.projects.some(x=>x.includes(problem.title))), pending:snapshot.pendingInputs.filter(i=>(i.problems ?? []).some(link=>resolveAssociationPath(link,snapshot.problems)===problemPath)), sources:[problem.source]}; }
