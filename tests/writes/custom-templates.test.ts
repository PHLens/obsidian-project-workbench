import { describe, expect, it } from 'vitest';
import { createProjectBundle, createProblemForProject, createTaskEntry } from '../../src/ui/vault-writes';
import { createInboxEntry } from '../../src/ui/inbox-writes';
import { interactiveVault } from '../helpers/interactive-vault';

const dirs = { projectDirectories: ['Projects'], problemDirectories: ['Problems'], taskDirectories: ['Tasks'], inputDirectories: ['Inputs'] };
const templates = { project: 'Templates/project.md', problem: 'Templates/problem.md', task: 'Templates/task.md', paper: 'Templates/paper.md', idea: 'Templates/idea.md', note: 'Templates/note.md' };

function appWithTemplates() {
  const test = interactiveVault({
    'Projects/Existing.md': '---\\ntype: project\\n---\\n# Existing',
    'Templates/project.md': '---\\ntype: custom-project\\ncustom: "{{goal}}"\\n---\\n# {{name}}\\n\\n{{goal}}\\n',
    'Templates/problem.md': '---\\ntype: custom-problem\\ncustom: "{{question}}"\\n---\\n# {{title}}\\n\\n{{question}}\\n',
    'Templates/task.md': '---\\ntype: custom-task\\ncustom: task {{projectPath}}\\n---\\n# {{title}}\\n{{project}}\\n',
    'Templates/paper.md': '---\\ntype: custom-paper\\ncustom: "{{source}}"\\n---\\n# {{title}}\\n{{content}}\\n',
    'Templates/idea.md': '# {{title}}\\n\\n{{content}}\\n',
    'Templates/note.md': '# {{title}}\\n\\n{{content}}\\n',
  });
  for (const [path, value] of test.contents) test.contents.set(path, value.split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10)));
  return test;
}

describe('custom template creation writes', () => {
  it('renders project and first-problem templates, patches required links, and preserves custom fields/body', async () => {
    const test = appWithTemplates();
    const result = await createProjectBundle(test.app, { name: 'New Project', goal: 'Reach the gate', firstProblem: 'First question' }, dirs, templates);
    expect(test.contents.get(result.projectPath)).toContain('custom: Reach the gate');
    expect(test.contents.get(result.projectPath)).toContain('type: project');
    expect(test.contents.get(result.projectPath)).toContain('problems:');
    expect(test.contents.get(result.problemPath)).toContain('custom: First question');
    expect(test.contents.get(result.problemPath)).toContain('project:');
    expect(test.contents.get(result.problemPath)).toContain('First question');
  });

  it('renders a problem template and keeps the protected project association update', async () => {
    const test = appWithTemplates();
    const path = await createProblemForProject(test.app, 'Projects/Existing.md', { title: 'New Problem', question: 'Question', status: 'inbox', stage: 'analysis', researchRole: 'probe', focus: true }, dirs, templates);
    expect(test.contents.get(path)).toContain('custom: Question');
    expect(test.contents.get(path)).toContain('type: problem');
    expect(test.contents.get('Projects/Existing.md')).toContain('New Problem');
  });

  it('selects the task and Inbox template by type while preserving controlled metadata', async () => {
    const test = appWithTemplates();
    const taskPath = await createTaskEntry(test.app, { title: 'Task title', project: 'Existing', projectPath: 'Projects/Existing.md' }, 'Tasks', templates);
    expect(test.contents.get(taskPath)).toContain('custom: task');
    expect(test.contents.get(taskPath)).toContain('Projects/Existing.md');
    expect(test.contents.get(taskPath)).toContain('tags:');
    const inputPath = await createInboxEntry(test.app, { title: 'A paper', kind: 'paper', content: 'Paper body', sourceValue: 'https://example.test', projects: [], problems: [] }, 'Inputs', templates);
    expect(test.contents.get(inputPath)).toContain('custom: https://example.test');
    expect(test.contents.get(inputPath)).toContain('type: inbox');
    const ideaPath = await createInboxEntry(test.app, { title: 'An idea', kind: 'idea', content: 'Idea body', sourceValue: '', projects: [], problems: [] }, 'Inputs', templates);
    expect(test.contents.get(ideaPath)).toContain('# An idea');
  });

  it('renders association variables and keeps built-in Inbox output as real Markdown', async () => {
    const test = appWithTemplates();
    test.contents.set('Templates/paper.md', '---\ntype: inbox\n---\n# {{title}}\nProject {{project}} {{projectPath}}\nProblem {{problem}} {{problemPath}}\n');
    const custom = await createInboxEntry(test.app, { title: 'Associated', kind: 'paper', content: '', sourceValue: '', projects: ['[[Projects/Existing.md]]'], problems: ['[[Problems/Q.md]]'] }, 'Inputs', templates);
    expect(test.contents.get(custom)).toContain('Projects/Existing.md');
    expect(test.contents.get(custom)).toContain('Problems/Q.md');
    const builtIn = await createInboxEntry(test.app, { title: 'Built-in', kind: 'note', content: 'Body', sourceValue: '', projects: [], problems: [] }, 'Inputs', { ...templates, note: '' });
    const builtInText = test.contents.get(builtIn)!;
    expect(builtInText).not.toContain('\\n');
    expect(builtInText).toContain('type: inbox');
  });

  it('uses built-ins when paths are empty and fails before creating files for a missing template', async () => {
    const test = appWithTemplates();
    const builtIn = await createInboxEntry(test.app, { title: 'Built in', kind: 'note', content: '', sourceValue: '', projects: [], problems: [] }, 'Inputs', { ...templates, note: '' });
    expect(test.contents.get(builtIn)).toContain('type: inbox');
    const before = [...test.contents.keys()];
    await expect(createInboxEntry(test.app, { title: 'Broken', kind: 'paper', content: '', sourceValue: '', projects: [], problems: [] }, 'Inputs', { ...templates, paper: 'Templates/missing.md' })).rejects.toThrow();
    expect([...test.contents.keys()]).toEqual(before);
  });

  it('rolls back a project bundle when its second template cannot be read', async () => {
    const test = appWithTemplates();
    const before = [...test.contents.keys()];
    await expect(createProjectBundle(test.app, { name: 'Rollback', goal: 'Goal', firstProblem: 'Question' }, dirs, { ...templates, project: 'Templates/missing.md' })).rejects.toThrow();
    expect([...test.contents.keys()]).toEqual(before);
  });
});
