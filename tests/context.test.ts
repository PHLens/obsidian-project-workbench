import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { exportProjectContext, applyUpdatePlan } from '../tools/cli/export-context';
const vault = resolve('test-vault'); const project = 'Projects/Demo Project.md';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
describe('context', () => {
  it('exports deterministic project context', () => { const x = exportProjectContext(vault, project); expect(x.snapshot.project.title).toBe('Demo Project'); expect(x.sources.length).toBeGreaterThan(0); });
  it('rejects formal vault', () => expect(() => exportProjectContext(resolve('formal-vault'), project)).toThrow());
  it('refuses stale writes', () => expect(() => applyUpdatePlan(vault, [{ path: project, expectedHash: 'bad', kind: 'property', name: 'status', value: 'active' }], true)).toThrow('Stale'));
  it('plans a property update without applying', () => { const path = resolve(vault, project); const raw = readFileSync(path, 'utf8'); const out = applyUpdatePlan(vault, [{ path: project, expectedHash: hash(raw), kind: 'property', name: 'status', value: 'active' }], false); expect(out[0].changed).toBe(true); expect(readFileSync(path, 'utf8')).toBe(raw); });
});
