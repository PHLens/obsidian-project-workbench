import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, sep, relative } from 'node:path';
import { buildProjectSnapshot } from '../../src/model/project-snapshot';
import { readMarkdownFiles } from './node-vault';

export function sha256(text: string): string { return createHash('sha256').update(text).digest('hex'); }
export function assertSafeVault(vault: string): string {
  const allowed = realpathSync(resolve(process.cwd(), 'test-vault'));
  let root: string;
  try { root = realpathSync(resolve(vault)); } catch { throw new Error('Vault path is outside the isolated test workspace'); }
  if (root !== allowed && !root.startsWith(allowed + sep)) throw new Error('Vault path is outside the isolated test workspace');
  if (root.endsWith('/formal-vault')) throw new Error('Vault path is outside the isolated test workspace');
  return root;
}
export function exportProjectContext(vault: string, project: string) {
  const root = assertSafeVault(vault);
  const files = readMarkdownFiles(root);
  const snapshot = buildProjectSnapshot(files, project);
  const sourcePaths = new Set([project, ...snapshot.problems.map((item) => item.path), ...snapshot.tasks.map((item) => item.path)]);
  return { schemaVersion: 1, vault: root, project, snapshot, sources: files.filter((f) => sourcePaths.has(f.path)).map((f) => ({ path: f.path, hash: sha256(f.content) })) };
}
export type UpdateOperation = { path: string; expectedHash: string; kind: 'property' | 'append' | 'pending'; name?: string; value?: unknown; content?: string };
export function applyUpdatePlan(vault: string, operations: UpdateOperation[], apply = false) {
  const root = assertSafeVault(vault); const results = [];
  for (const op of operations) {
    const path = resolve(root, op.path); if (!path.startsWith(root + sep) || !op.path.endsWith('.md')) throw new Error('Only Markdown files inside the vault may be updated');
    const rel = relative(root, path);
    let cursor = root;
    for (const part of rel.split(sep)) { cursor = resolve(cursor, part); if (lstatSync(cursor).isSymbolicLink()) throw new Error('Symlink updates are not allowed'); }
    const raw = readFileSync(path, 'utf8'); if (sha256(raw) !== op.expectedHash) throw new Error(`Stale file: ${op.path}`);
    let next = raw;
    if (op.kind === 'property') { if (!op.name || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(op.name)) throw new Error('Invalid property name'); const line = new RegExp(`^${op.name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}:.*$`, 'm'); const value = typeof op.value === 'string' ? JSON.stringify(op.value) : JSON.stringify(op.value); next = line.test(next) ? next.replace(line, `${op.name}: ${value}`) : `---\n${op.name}: ${value}\n---\n${next}`; }
    else if (op.kind === 'append') next = raw + `\n${op.content ?? ''}\n`;
    else if (op.kind === 'pending') next = /^pending:.*$/m.test(raw) ? raw.replace(/^pending:.*$/m, 'pending: true') : `---\npending: true\n---\n${raw}`;
    if (apply) { const tmp = path + '.tmp'; writeFileSync(tmp, next); renameSync(tmp, path); }
    results.push({ path: op.path, changed: next !== raw, oldHash: op.expectedHash, newHash: sha256(next) });
  }
  return results;
}
