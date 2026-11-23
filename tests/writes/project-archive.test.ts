import { describe, expect, it } from 'vitest';
import { archiveMarkdown } from '../../src/ui/vault-writes';

describe('project archive workflow', () => {
  it('archives only the project note and preserves related content', () => {
    const raw = '---\ntype: project\ntitle: Demo\nstatus: active\nproblems: ["[[Problem]]"]\n---\n# Demo\n';
    const archived = archiveMarkdown(raw);
    expect(archived).toContain('archived: true');
    expect(archived).toContain('problems:');
    expect(archived).toContain('# Demo');
  });
});
