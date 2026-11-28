import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/ui/settings-model';
import { normalizeTemplatePaths } from '../../src/ui/template-renderer';

describe('template settings compatibility', () => {
  it('loads missing and malformed template maps without changing other settings', () => {
    const loaded = { ...DEFAULT_SETTINGS, projectDirectories: ['Projects'], columnLayout: DEFAULT_SETTINGS.columnLayout };
    const normalized = { ...loaded, templatePaths: normalizeTemplatePaths((loaded as any).templatePaths) };
    expect(normalized.projectDirectories).toEqual(['Projects']);
    expect(normalized.columnLayout).toEqual(DEFAULT_SETTINGS.columnLayout);
    expect(normalized.templatePaths).toEqual({ project: '', problem: '', task: '', paper: '', idea: '', note: '' });
  });
});
