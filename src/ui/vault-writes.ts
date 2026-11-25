import { parse, stringify } from 'yaml';
import type { App, TFile } from 'obsidian';
import { localDate, readTemplate, type TemplatePaths } from './template-renderer';

export interface ProjectBundleInput { name: string; goal: string; firstProblem: string; }
export interface WriteResult { path: string; changed: boolean; oldHash: string; newHash: string; }
export interface ProjectBundleText { projectPath: string; problemPath: string; project: string; problem: string; }
export interface DataDirectories { projectDirectories?: string[]; problemDirectories?: string[]; taskDirectories?: string[]; inputDirectories?: string[]; }
type CreationTemplatePaths = Partial<TemplatePaths>;
export function sha256(text: string): string { let hash = 2166136261; for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16).padStart(8, '0'); }
export function assertExpectedHash(current: string, expectedHash: string): void { if (sha256(current) !== expectedHash) throw new Error('文件冲突：内容已被外部修改，请重新加载后重试。'); }
export function validateMarkdownPath(path: string): void { if (!path.endsWith('.md') || path.split('/').some((part) => !part || part === '..' || part.startsWith('.obsidian'))) throw new Error('只能写入 Vault 内的 Markdown 文件'); }
export function preflightProjectBundle(input: { projectExists: boolean; problemExists: boolean }): void { if (input.projectExists || input.problemExists) throw new Error('项目或首个问题文件已存在，未创建任何文件。'); }
export function createProjectBundleText(input: ProjectBundleInput, directories: DataDirectories = {}): ProjectBundleText {
  const safe = input.name.trim().replace(/[\\/:*?"<>|]/g, '-'); const problem = input.firstProblem.trim();
  const projectDirectory = directories.projectDirectories?.[0] ?? 'Projects';
  const problemDirectory = directories.problemDirectories?.[0] ?? 'Problems';
  return { projectPath: `${projectDirectory}/${safe}.md`, problemPath: `${problemDirectory}/${problem}.md`, problem: `---\ntype: problem\ntags: [research, problem]\nup: "[[${safe}]]"\nproject: "[[${safe}]]"\nstatus: exploring\nstage: inbox\nresearch_role: mainline\n---\n# ${problem}\n\n## Overview\n\n${problem}\n\n## Next Step\n\n- [ ] Define first experiment\n`, project: `---\ntype: project\ntitle: ${JSON.stringify(input.name.trim())}\ntags: [project, research]\nstatus: proposed\nproblems: ["[[${problem}]]"]\nfocus_problems: ["[[${problem}]]"]\ncurrent_gate: ${JSON.stringify(input.goal.trim())}\n---\n# ${input.name.trim()}\n\n${input.goal.trim()}\n\n## Research Question\n\n[[${problem}]]\n\n## Success Criterion\n\n## Next Milestone\n\n## Tasks\n` };
}
function splitFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } { const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/); if (!match) return { frontmatter: {}, body: raw }; const parsed = parse(match[1]); return { frontmatter: parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}, body: raw.slice(match[0].length) }; }
function withFrontmatter(raw: string, frontmatter: Record<string, unknown>, body: string): string { return `---\n${stringify(frontmatter).trim()}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`; }
export function applyFrontmatterPatch(raw: string, patch: Record<string, unknown>): string { const parsed = splitFrontmatter(raw); return withFrontmatter(raw, { ...parsed.frontmatter, ...patch }, parsed.body); }
async function renderOrBuiltIn(app: App, type: keyof TemplatePaths, variables: Record<string, string>, builtIn: string, templatePaths: CreationTemplatePaths): Promise<string> {
  const template = templatePaths[type];
  return template ? readTemplate(app, template, variables) : builtIn;
}
function basename(path: string): string { return path.split('/').pop()?.replace(/\.md$/, '') ?? path; }
export function updateTaskText(raw: string, patch: { status?: string; priority?: string; due?: string }): string { return applyFrontmatterPatch(raw, patch); }
export function transitionPending(raw: string, status: 'pending' | 'processed'): string { return applyFrontmatterPatch(raw, { pending: status === 'pending', processing_status: status }); }
export function archiveMarkdown(raw: string): string { return applyFrontmatterPatch(raw, { archived: true }); }
async function readTFile(app: App, path: string): Promise<TFile> { const file = app.vault.getFileByPath(path); if (!file) throw new Error(`找不到文件：${path}`); return file; }
export async function writeFrontmatterWithExpectedHash(app: App, path: string, expectedHash: string, mutate: (frontmatter: Record<string, unknown>) => void): Promise<WriteResult> {
  validateMarkdownPath(path);
  const file = await readTFile(app, path);
  let before = '';
  const next = await app.vault.process(file, (raw) => {
    assertExpectedHash(raw, expectedHash);
    before = raw;
    const parsed = splitFrontmatter(raw);
    mutate(parsed.frontmatter);
    return withFrontmatter(raw, parsed.frontmatter, parsed.body);
  });
  return { path, changed: next !== before, oldHash: expectedHash, newHash: sha256(next) };
}
export async function createProjectBundle(app: App, input: ProjectBundleInput, directories: DataDirectories = {}, templatePaths: CreationTemplatePaths = {}): Promise<{ projectPath: string; problemPath: string }> {
  const text = createProjectBundleText(input, directories); validateMarkdownPath(text.projectPath); validateMarkdownPath(text.problemPath);
  if (app.vault.getAbstractFileByPath(text.projectPath) || app.vault.getAbstractFileByPath(text.problemPath)) throw new Error('Project or first problem already exists.');
  const projectName = input.name.trim(), problemTitle = input.firstProblem.trim();
  const variables = { title: projectName, name: projectName, goal: input.goal.trim(), question: problemTitle, project: projectName, projectPath: text.projectPath, problem: problemTitle, problemPath: text.problemPath, status: 'proposed', stage: 'inbox', researchRole: 'mainline', date: localDate(), content: '' };
  const projectTemplate = await renderOrBuiltIn(app, 'project', variables, text.project, templatePaths);
  const problemTemplate = await renderOrBuiltIn(app, 'problem', variables, text.problem, templatePaths);
  const projectText = applyFrontmatterPatch(projectTemplate, { type: 'project', title: projectName, status: 'proposed', current_gate: input.goal.trim(), problems: ['[[' + basename(text.problemPath) + ']]'], focus_problems: ['[[' + basename(text.problemPath) + ']]'] });
  const problemText = applyFrontmatterPatch(problemTemplate, { type: 'problem', project: '[[' + basename(text.projectPath) + ']]', up: '[[' + basename(text.projectPath) + ']]', status: 'exploring', stage: 'inbox', research_role: 'mainline' });
  await app.vault.create(text.problemPath, problemText);
  try { await app.vault.create(text.projectPath, projectText); } catch (error) {
    const created = app.vault.getAbstractFileByPath(text.problemPath);
    if (created && 'extension' in created) await app.fileManager.trashFile(created);
    throw new Error('Project creation failed and the first problem was rolled back: ' + String(error));
  }
  return { projectPath: text.projectPath, problemPath: text.problemPath };
}
export async function createProblemForProject(app: App, projectPath: string, input: { title: string; question: string; status: string; stage: string; researchRole: string; focus: boolean }, directories: DataDirectories = {}, templatePaths: CreationTemplatePaths = {}): Promise<string> {
  const safe = input.title.trim(); const problemPath = (directories.problemDirectories?.[0] ?? 'Problems') + '/' + safe + '.md'; validateMarkdownPath(problemPath); if (app.vault.getAbstractFileByPath(problemPath)) throw new Error('Problem file already exists.');
  const project = await readTFile(app, projectPath); const projectRaw = await app.vault.read(project); const projectTitle = project.basename;
  const builtIn = '---\ntype: problem\ntags: [research, problem]\nproject: "[[' + projectTitle + ']]"\nstatus: ' + input.status + '\nstage: ' + input.stage + '\nresearch_role: ' + input.researchRole + '\n---\n# ' + safe + '\n\n## Overview\n\n' + input.question + '\n\n## Next Step\n\n';
  const content = await renderOrBuiltIn(app, 'problem', { title: safe, name: safe, question: input.question, project: projectTitle, projectPath, problem: safe, problemPath, status: input.status, stage: input.stage, researchRole: input.researchRole, date: localDate(), goal: '', content: '' }, builtIn, templatePaths);
  const created = await app.vault.create(problemPath, applyFrontmatterPatch(content, { type: 'problem', project: '[[' + projectTitle + ']]', status: input.status, stage: input.stage, research_role: input.researchRole }));
  try {
    const links = (frontmatter: Record<string, unknown>) => { const current = Array.isArray(frontmatter.problems) ? frontmatter.problems.filter((value): value is string => typeof value === 'string') : []; const link = '[[' + safe + ']]'; frontmatter.problems = [...new Set([...current, link])]; if (input.focus) { const focus = Array.isArray(frontmatter.focus_problems) ? frontmatter.focus_problems.filter((value): value is string => typeof value === 'string') : []; frontmatter.focus_problems = [...new Set([...focus, link])]; } };
    await writeFrontmatterWithExpectedHash(app, projectPath, sha256(projectRaw), links);
  } catch (error) { await app.fileManager.trashFile(created); throw error; }
  return problemPath;
}
export async function createTaskEntry(app: App, input: { title: string; project: string; projectPath?: string }, directory: string, templatePaths: CreationTemplatePaths = {}): Promise<string> {
  const title = input.title.trim(); const path = directory + '/' + title + '.md'; validateMarkdownPath(path); if (app.vault.getAbstractFileByPath(path)) throw new Error('Task file already exists.');
  const builtIn = '---\nstatus: open\ntags: [task]\nprojects: ["[[' + input.project + ']]"]\n---\n# ' + title + '\n';
  const rendered = await renderOrBuiltIn(app, 'task', { title, name: title, project: input.project, projectPath: input.projectPath ?? '', problem: '', problemPath: '', goal: '', question: '', content: '', kind: 'task', source: '', status: 'open', stage: '', researchRole: '', date: localDate() }, builtIn, templatePaths);
  await app.vault.create(path, applyFrontmatterPatch(rendered, { status: 'open', tags: ['task'], projects: ['[[' + input.project + ']]'] }));
  return path;
}
export async function updateProblem(app: App, path: string, input: Record<string, unknown>, expectedHash: string): Promise<WriteResult> { return writeFrontmatterWithExpectedHash(app, path, expectedHash, (frontmatter) => Object.assign(frontmatter, input)); }
export async function updateTask(app: App, path: string, input: { status?: string; priority?: string; due?: string }, expectedHash: string): Promise<WriteResult> { return writeFrontmatterWithExpectedHash(app, path, expectedHash, (frontmatter) => Object.assign(frontmatter, input)); }
export async function updatePendingInput(app: App, path: string, transition: 'pending' | 'linked' | 'deferred' | 'reference', expectedHash: string): Promise<WriteResult> { return writeFrontmatterWithExpectedHash(app, path, expectedHash, (frontmatter) => Object.assign(frontmatter, { pending: transition === 'pending', processing_status: transition })); }
export async function archiveEntity(app: App, path: string, expectedHash: string): Promise<WriteResult> { return writeFrontmatterWithExpectedHash(app, path, expectedHash, (frontmatter) => { frontmatter.archived = true; }); }
export async function linkExistingProblemToProject(app: App, projectPath: string, problemPath: string, options: { focus?: boolean; expectedHash: string }): Promise<WriteResult> { return writeFrontmatterWithExpectedHash(app, projectPath, options.expectedHash, (frontmatter) => { const current = Array.isArray(frontmatter.problems) ? frontmatter.problems.filter((value): value is string => typeof value === 'string') : []; const link = '[[' + (problemPath.split('/').pop()?.replace(/\.md$/, '') ?? problemPath) + ']]'; frontmatter.problems = [...new Set([...current, link])]; if (options.focus) { const focus = Array.isArray(frontmatter.focus_problems) ? frontmatter.focus_problems.filter((value): value is string => typeof value === 'string') : []; frontmatter.focus_problems = [...new Set([...focus, link])]; } }); }
