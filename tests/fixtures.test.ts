import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'test-vault');

describe('test vault fixture', () => {
  it('contains the minimum Demo Project fixture and split device configs', () => {
    expect(existsSync(resolve(root, 'Spaces/Research/Projects/Demo Project.md'))).toBe(true);
    expect(existsSync(resolve(root, 'Spaces/Research/Problems/Workload Expansion.md'))).toBe(true);
    expect(existsSync(resolve(root, 'Spaces/Research/Problems/Precision Study.md'))).toBe(true);
    expect(existsSync(resolve(root, 'Spaces/GTD/Tasks/Select representative workload.md'))).toBe(true);
    expect(existsSync(resolve(root, 'Calendar/dailynotes/2026-11-22.md'))).toBe(true);
    expect(existsSync(resolve(root, '.obsidian-desktop/community-plugins.json'))).toBe(true);
    expect(existsSync(resolve(root, '.obsidian-mobile/community-plugins.json'))).toBe(true);
    expect(existsSync(resolve(root, '.obsidian'))).toBe(false);
    expect(JSON.parse(readFileSync(resolve(root, '.obsidian-desktop/community-plugins.json'), 'utf8'))).toContain('research-workbench');
  });
});
