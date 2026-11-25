import type { App } from 'obsidian';
import { stringify } from 'yaml';
import type { InputKind, InboxStatus } from '../model/inbox';
import { applyFrontmatterPatch, validateMarkdownPath, writeFrontmatterWithExpectedHash, type WriteResult } from './vault-writes';
import { localDate, readTemplate, type TemplatePaths } from './template-renderer';
export interface InboxAssociations { projects: string[]; problems: string[]; }
export interface InboxCaptureInput extends InboxAssociations { title: string; kind: InputKind; content: string; sourceValue: string; }
export function associationLinks(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean).map((value) => value.startsWith('[[') && value.endsWith(']]') ? value : `[[${value}]]`))];
}
export async function createInboxEntry(app: App, input: InboxCaptureInput, directory: string, templatePaths: Partial<TemplatePaths> = {}): Promise<string> {
  if (!directory?.trim()) throw new Error('请先配置待讨论输入目录。');
  validateMarkdownPath(`${directory}/entry.md`);
  const folder = app.vault.getAbstractFileByPath(directory);
  if (!folder || !('children' in folder)) throw new Error('配置的待讨论输入目录不存在，请先创建该目录。');
  const title = input.title.trim();
  if (!title) throw new Error('请输入资料标题。');
  if (!['paper', 'idea', 'note'].includes(input.kind)) throw new Error('请选择资料类型。');
  const basename = title.replace(/[\\/:*?"<>|\[\]#^]/g, '-').replace(/^\.+/, '').trim();
  if (!basename) throw new Error('请输入有效的资料标题。');
  let path = `${directory}/${basename}.md`;
  for (let suffix = 2; app.vault.getAbstractFileByPath(path); suffix++) path = `${directory}/${basename} (${suffix}).md`;
  validateMarkdownPath(path);
  const fields = { type: 'inbox', title, input_kind: input.kind, pending: true, processing_status: 'pending', projects: associationLinks(input.projects), problems: associationLinks(input.problems), source: input.sourceValue.trim() };
  const builtIn = ['---', stringify(fields).trim(), '---', '# ' + title, '', input.content.trim(), ''].join(String.fromCharCode(10));
  const template = templatePaths[input.kind];
  const linkContext = (values: string[]) => { const value = values.find((item) => item.trim()); const path = value?.replace(/^\[\[/, '').replace(/\]\]$/, '') ?? ''; return { path, title: path.split('/').pop()?.replace(/\.md$/, '') ?? '' }; };
  const projectRef = linkContext(input.projects), problemRef = linkContext(input.problems);
  const rendered = template ? await readTemplate(app, template, { title, name: title, content: input.content.trim(), kind: input.kind, source: input.sourceValue.trim(), project: projectRef.title, projectPath: projectRef.path, problem: problemRef.title, problemPath: problemRef.path, goal: '', question: '', status: 'pending', stage: '', researchRole: '', date: localDate() }) : builtIn;
  await app.vault.create(path, applyFrontmatterPatch(rendered, fields));
  return path;
}
export function updateInboxAssociations(app: App, path: string, expectedHash: string, links: InboxAssociations): Promise<WriteResult> {
  return writeFrontmatterWithExpectedHash(app, path, expectedHash, (fm) => {
    fm.projects = associationLinks(links.projects);
    fm.problems = associationLinks(links.problems);
    delete fm.project;
  });
}
export function changeInboxState(app: App, path: string, expectedHash: string, status: InboxStatus): Promise<WriteResult> {
  if (status !== 'pending' && status !== 'processed') return Promise.reject(new Error('请选择待处理或已处理。'));
  return writeFrontmatterWithExpectedHash(app, path, expectedHash, (fm) => {
    fm.processing_status = status;
    fm.pending = status === 'pending';
  });
}
