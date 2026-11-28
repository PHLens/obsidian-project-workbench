import { describe, expect, it, vi } from 'vitest';
import { createConfiguredNote, templateUsesTemplater } from '../../src/ui/template-renderer';
import { TFile } from '../helpers/obsidian-dom';

describe('Templater runtime adapter', () => {
  it('detects executable Templater syntax separately from native variables', () => {
    expect(templateUsesTemplater('<% tp.file.title %>')).toBe(true);
    expect(templateUsesTemplater('<%* const x = 1 %>')).toBe(true);
    expect(templateUsesTemplater('# {{title}}')).toBe(false);
  });

  it('creates and reads a Templater-rendered note through the optional runtime', async () => {
    const templateFile = new TFile('Templates/problem.md');
    const created = new TFile('Problems/Q.md');
    const contents = new Map([[templateFile.path, '<% tp.file.title %>'], [created.path, '# Q']]);
    const createNew = vi.fn(async (_template: TFile, _folder: string, _filename: string, _open: boolean) => created);
    const app = { plugins: { getPlugin: (id: string) => id === 'templater-obsidian' ? { templater: { create_new_note_from_template: createNew } } : null }, vault: { getFileByPath: (path: string) => path === templateFile.path ? templateFile : null, read: async (file: TFile) => contents.get(file.path)!, getAbstractFileByPath: (path: string) => path === created.path ? created : null, modify: async (file: TFile, content: string) => contents.set(file.path, content), delete: async () => {} } } as any;
    const result = await createConfiguredNote(app, 'Templates/problem.md', 'Problems', 'Q', { title: 'Q' }, 'fallback');
    expect(result).toMatchObject({ path: 'Problems/Q.md', usedTemplater: true, content: '# Q' });
    expect(createNew).toHaveBeenCalledWith(templateFile, 'Problems', 'Q', false);
  });

  it('rejects executable templates when Templater is unavailable instead of writing raw syntax', async () => {
    const templateFile = new TFile('Templates/problem.md');
    const app = { plugins: { getPlugin: () => null }, vault: { getFileByPath: () => templateFile, read: async () => '<% tp.file.title %>' } } as any;
    await expect(createConfiguredNote(app, 'Templates/problem.md', 'Problems', 'Q', {}, 'fallback')).rejects.toThrow(/Templater/i);
  });
});
