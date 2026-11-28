import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeTemplatePaths, renderTemplate, readTemplate, validateTemplatePath } from '../../src/ui/template-renderer';
import { DEFAULT_SETTINGS } from '../../src/ui/settings-model';
import { TFile } from '../helpers/obsidian-dom';

afterEach(() => vi.restoreAllMocks());

describe('custom creation templates', () => {
  it('normalizes all six template path settings and preserves safe values only', () => {
    expect(normalizeTemplatePaths({ project: 'Templates/project.md', paper: 'Templates/paper.md', idea: '../secret.md', note: 4 })).toEqual({
      project: 'Templates/project.md', problem: '', task: '', paper: 'Templates/paper.md', idea: '', note: '',
    });
    expect(DEFAULT_SETTINGS.templatePaths).toEqual({ project: '', problem: '', task: '', paper: '', idea: '', note: '' });
  });

  it.each(['', '/Templates/project.md', '../Templates/project.md', 'Templates/../project.md', '.obsidian/project.md', 'Templates/project.txt'])('rejects unsafe template path %s', (path) => {
    expect(() => validateTemplatePath(path)).toThrow();
  });

  it('replaces known variables once and rejects unknown or malformed variables', () => {
    expect(renderTemplate('# {{title}}\\n{{content}}\\n', { title: 'Paper', content: 'Body' })).toBe('# Paper\\nBody\\n');
    expect(() => renderTemplate('{{unknown}}', {})).toThrow(/unknown/i);
    expect(() => renderTemplate('{{title', { title: 'Paper' })).toThrow(/variable/i);
    expect(() => renderTemplate('{{title}}}}', { title: 'Paper' })).toThrow(/variable/i);
  });

  it('reads a template at submit time and validates rendered YAML while preserving body', async () => {
    const file = new TFile('Templates/paper.md');
    const read = vi.fn(async () => '---\\ntype: inbox\\ncustom: \"{{title}}\"\\n---\\n# {{title}}\\n\\n{{content}}\\n');
    const app = { vault: { getFileByPath: (path: string) => path === file.path ? file : null, read } } as any;
    await expect(readTemplate(app, 'Templates/paper.md', { title: '论文', content: '正文' })).resolves.toContain('custom: \"论文\"');
    expect(read).toHaveBeenCalledWith(file);
    await expect(readTemplate(app, 'Templates/missing.md', {})).rejects.toThrow(/找不到|missing/i);
    const invalid = new TFile('Templates/invalid.md');
    app.vault.getFileByPath = (path: string) => path === invalid.path ? invalid : null;
    app.vault.read = vi.fn(async () => ['---', 'invalid: [', '---', 'body'].join(String.fromCharCode(10)));
    await expect(readTemplate(app, invalid.path, {})).rejects.toThrow(/YAML|frontmatter/i);
  });

  it('does not add template paths to data scope defaults', () => {
    expect(DEFAULT_SETTINGS.projectDirectories).toEqual([]);
    expect(DEFAULT_SETTINGS.inputDirectories).toEqual([]);
  });
});
