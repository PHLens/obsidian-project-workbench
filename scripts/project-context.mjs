import { exportProjectContext } from '../dist/context/export-context.js';
const args = Object.fromEntries(process.argv.slice(2).map((x, i, a) => x.startsWith('--') ? [x.slice(2), a[i + 1]] : null).filter(Boolean));
console.log(JSON.stringify(exportProjectContext(args.vault, args.project), null, 2));
