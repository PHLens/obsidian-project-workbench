import { applyUpdatePlan } from '../dist/cli/export-context.js';
const args = {}; for (let i=2;i<process.argv.length;i++){const x=process.argv[i]; if(!x.startsWith('--')) continue; const key=x.slice(2); const next=process.argv[i+1]; if(next && !next.startsWith('--')){args[key]=next;i++;} else args[key]=true;}
console.log(JSON.stringify(applyUpdatePlan(args.vault, JSON.parse(args.input), args.apply === 'true'), null, 2));
