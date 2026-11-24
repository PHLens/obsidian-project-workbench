import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeDirectoryList, isPathInDirectories } from '../../src/ui/settings-model';
import { buildProjectIndex, buildProjectSnapshot } from '../../src/model/project-snapshot';

describe('configurable workbench data scope', () => {
  it('provides separate defaults for all workbench data directories', () => {
    expect(DEFAULT_SETTINGS.projectDirectories).toEqual([]);
    expect(DEFAULT_SETTINGS.problemDirectories).toEqual([]);
    expect(DEFAULT_SETTINGS.taskDirectories).toEqual([]);
    expect(DEFAULT_SETTINGS.inputDirectories).toEqual([]);
    expect(DEFAULT_SETTINGS.recordDirectories).toEqual([]);
  });

  it('normalizes comma separated directory settings and matches path boundaries', () => {
    expect(normalizeDirectoryList(' Projects, Other Projects, Projects ')).toEqual(['Projects', 'Other Projects']);
    expect(isPathInDirectories('Projects/P.md', ['Projects'])).toBe(true);
    expect(isPathInDirectories('ProjectsArchive/P.md', ['Projects'])).toBe(false);
  });

  it('uses configured project and problem directories in model indexing', () => {
    const files = [
      { path: 'Work/Projects/Chosen.md', content: '---\ntype: project\ntitle: Chosen\nproblems: ["[[Chosen problem]]"]\n---\n# Chosen' },
      { path: 'Work/Problems/Chosen problem.md', content: '---\ntype: problem\nup: "[[Chosen]]"\n---\n# Chosen problem' },
      { path: 'Projects/Default.md', content: '---\ntype: project\ntitle: Default\n---\n# Default' },
    ];
    expect(buildProjectIndex(files, { projectDirectories: ['Work/Projects'] }).map((project) => project.title)).toEqual(['Chosen']);
    expect(buildProjectSnapshot(files, 'Work/Projects/Chosen.md', { projectDirectories: ['Work/Projects'], problemDirectories: ['Work/Problems'] }).problems.map((problem) => problem.title)).toEqual(['Chosen problem']);
  });
});
