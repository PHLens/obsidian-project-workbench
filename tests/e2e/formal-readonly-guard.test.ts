import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

describe('formal vault readonly guard', () => {
  it('detects non-target note changes and permits only plugin/config targets', () => {
    const root = mkdtempSync(join(tmpdir(), 'rw-formal-'));
    mkdirSync(join(root, '.obsidian-desktop/plugins/research-workbench'), { recursive: true });
    mkdirSync(join(root, '.obsidian-mobile/plugins/research-workbench'), { recursive: true });
    writeFileSync(join(root, '.obsidian-desktop/community-plugins.json'), '[]\n');
    writeFileSync(join(root, '.obsidian-mobile/community-plugins.json'), '[]\n');
    mkdirSync(join(root, 'Projects'), { recursive: true });
    writeFileSync(join(root, 'Projects/P.md'), '# P\n');
    const baseline = join(root, 'baseline.json');
    execFileSync('node', ['scripts/verify-formal-vault-readonly.mjs', '--vault', root, '--write-baseline', baseline], { encoding: 'utf8' });
    writeFileSync(join(root, '.obsidian-desktop/plugins/research-workbench/main.js'), 'plugin');
    writeFileSync(join(root, '.obsidian-desktop/community-plugins.json'), '["research-workbench"]\n');
    expect(execFileSync('node', ['scripts/verify-formal-vault-readonly.mjs', '--vault', root, '--baseline', baseline], { encoding: 'utf8' })).toContain('readonly ok');
    writeFileSync(join(root, 'Projects/P.md'), '# changed\n');
    expect(() => execFileSync('node', ['scripts/verify-formal-vault-readonly.mjs', '--vault', root, '--baseline', baseline], { encoding: 'utf8' })).toThrow();
  });
});
