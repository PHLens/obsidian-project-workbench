import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2).reduce((out, value, index, values) => { if (value.startsWith('--')) out[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : true; return out; }, {});
const vault = path.resolve(args.vault);
const baselinePath = path.resolve(args.baseline ?? args['write-baseline'] ?? path.join(vault, '.research-workbench-readonly-baseline.json'));
const target = (relative) => relative === '.obsidian-desktop/community-plugins.json' || relative === '.obsidian-mobile/community-plugins.json' || relative.startsWith('.obsidian-desktop/plugins/research-workbench/') || relative.startsWith('.obsidian-mobile/plugins/research-workbench/');
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function files(root, current = root, out = []) { for (const entry of fs.readdirSync(current, { withFileTypes: true })) { const absolute = path.join(current, entry.name); const relative = path.relative(root, absolute).split(path.sep).join('/'); if (entry.isDirectory()) files(root, absolute, out); else out.push({ path: relative, sha256: hash(absolute), size: fs.statSync(absolute).size }); } return out; }
const current = files(vault).filter((item) => !item.path.startsWith('baseline.json') && !item.path.startsWith('.research-workbench-readonly-baseline.json'));
if (args['write-baseline']) { fs.writeFileSync(baselinePath, JSON.stringify({ vault, files: current }, null, 2)); console.log(`baseline written: ${baselinePath}`); process.exit(0); }
if (!args.baseline) throw new Error('baseline is required');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const before = new Map(baseline.files.map((item) => [item.path, item.sha256]));
const now = new Map(current.map((item) => [item.path, item.sha256]));
const changed = [...new Set([...before.keys(), ...now.keys()])].filter((relative) => before.get(relative) !== now.get(relative));
const unexpected = changed.filter((relative) => !target(relative));
if (unexpected.length) { console.error(JSON.stringify({ unexpected }, null, 2)); process.exit(1); }
console.log(`readonly ok: ${changed.length} target changes`);
