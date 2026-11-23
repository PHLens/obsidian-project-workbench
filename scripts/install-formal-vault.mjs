import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const args = process.argv.slice(2).reduce((out, value, index, values) => { if (value.startsWith('--')) out[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : true; return out; }, {});
const repo = path.resolve(args.repo ?? process.cwd()); const vault = path.resolve(args.vault); if (!args.formalVault || vault !== path.resolve(args.formalVault)) throw new Error('formal installer requires --formalVault matching --vault'); if (args.apply !== 'true') throw new Error('refusing to install without --apply true'); const backup = path.resolve(args.backup); if (backup.startsWith(vault + path.sep)) throw new Error('backup must be outside the Vault'); fs.mkdirSync(backup, { recursive: true });
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); const baseline = args.baseline ? JSON.parse(fs.readFileSync(path.resolve(args.baseline), 'utf8')) : null;
if (!baseline) throw new Error('install requires --baseline from verify-formal-vault-readonly');
function copyConfig(name) { fs.cpSync(path.join(vault, name), path.join(backup, name), { recursive: true, dereference: false }); }
copyConfig('.obsidian-desktop'); copyConfig('.obsidian-mobile');
const source = { 'main.js': path.join(repo, 'dist/main.js'), 'manifest.json': path.join(repo, 'manifest.json'), 'styles.css': path.join(repo, 'styles.css') };
const changed = [];
for (const config of ['.obsidian-desktop', '.obsidian-mobile']) {
  const target = path.join(vault, config, 'plugins/research-workbench'); fs.mkdirSync(target, { recursive: true });
  for (const [name, from] of Object.entries(source)) { fs.copyFileSync(from, path.join(target, name)); changed.push(`${config}/plugins/research-workbench/${name}`); }
  const communityPath = path.join(vault, config, 'community-plugins.json'); const ids = JSON.parse(fs.readFileSync(communityPath, 'utf8')); if (!ids.includes('research-workbench')) { ids.push('research-workbench'); fs.writeFileSync(communityPath, JSON.stringify(ids, null, 2) + '\n'); changed.push(`${config}/community-plugins.json`); }
}
const baselineMap = new Map(baseline.files.map((entry) => [entry.path, entry.sha256])); for (const [relative, before] of baselineMap) { if (relative.startsWith('.obsidian-desktop/plugins/research-workbench/') || relative.startsWith('.obsidian-mobile/plugins/research-workbench/') || relative === '.obsidian-desktop/community-plugins.json' || relative === '.obsidian-mobile/community-plugins.json') continue; const file = path.join(vault, relative); if (!fs.existsSync(file) || digest(file) !== before) throw new Error(`non-target file changed during install: ${relative}`); }
console.log(JSON.stringify({ vault, backup, changed, version: JSON.parse(fs.readFileSync(source['manifest.json'], 'utf8')).version }, null, 2));
