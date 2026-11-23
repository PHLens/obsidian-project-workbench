import { describe, expect, it } from 'vitest';
import { applyFrontmatterPatch, archiveMarkdown, createProjectBundleText, transitionPending, updateTaskText } from '../../src/ui/vault-writes';

describe('protected CRUD workflows', () => {
  it('creates a project bundle with bidirectional links and focus', () => {
    const result = createProjectBundleText({ name: 'New', goal: 'Goal', firstProblem: 'First question' });
    expect(result.project).toContain('problems: ["[[First question]]"]');
    expect(result.project).toContain('focus_problems: ["[[First question]]"]');
    expect(result.problem).toContain('up: "[[New]]"');
    expect(result.problem).toContain('project: "[[New]]"');
  });
  it('updates supported task fields and archives without deleting markdown', () => {
    const raw = '---\nstatus: open\npriority: normal\n---\n# Task\n';
    const updated = updateTaskText(raw, { status: 'done', priority: 'high', due: '2026-12-01' });
    expect(updated).toContain('status: done');
    expect(updated).toContain('due: 2026-12-01');
    expect(archiveMarkdown(updated)).toContain('archived: true');
  });
  it('transitions pending input explicitly', () => {
    expect(transitionPending('---\npending: true\nprocessing_status: pending\n---\n', 'linked')).toContain('processing_status: linked');
  });
  it('patches problem properties without rewriting its body', () => {
    const raw = '---\nstatus: exploring\n---\n# Problem\n\n## Next Step\n- [ ] Test\n';
    const updated = applyFrontmatterPatch(raw, { status: 'active', stage: 'evaluation', research_role: 'mainline' });
    expect(updated).toContain('status: active');
    expect(updated).toContain('## Next Step\n- [ ] Test');
  });
});
