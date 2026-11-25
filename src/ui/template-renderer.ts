import { parse } from 'yaml';
import type { App, TFile } from 'obsidian';

export type TemplateType = 'project' | 'problem' | 'task' | 'paper' | 'idea' | 'note';
export type TemplatePaths = Record<TemplateType, string>;
export const DEFAULT_TEMPLATE_PATHS: TemplatePaths = { project: '', problem: '', task: '', paper: '', idea: '', note: '' };

export function normalizeTemplatePaths(value: unknown): TemplatePaths {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_TEMPLATE_PATHS };
  for (const key of Object.keys(result) as TemplateType[]) {
    const candidate = source[key];
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try { validateTemplatePath(candidate.trim()); result[key] = candidate.trim(); } catch { /* Invalid saved paths fall back to built-ins. */ }
  }
  return result;
}

export function validateTemplatePath(path: string): void {
  const normalized = path.trim();
  if (!normalized || normalized.startsWith('/') || !normalized.endsWith('.md') || normalized.split('/').some((part) => !part || part === '..' || part === '.' || part.startsWith('.obsidian'))) {
    throw new Error('模板路径必须是 Vault 内的相对 Markdown 路径：' + path);
  }
}

function frontmatterIsValid(raw: string): void {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return;
  try {
    const value = parse(match[1]);
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('frontmatter must be a YAML object');
  } catch (error) {
    throw new Error('模板 frontmatter YAML 无效：' + String(error));
  }
}

export function renderTemplate(raw: string, variables: Record<string, string>): string {
  const allowed = new Set(Object.keys(variables));
  if ((raw.includes('{{') && !raw.includes('}}')) || (raw.includes('}}') && !raw.includes('{{')) || /{{(?![A-Za-z][A-Za-z0-9]*}})/.test(raw)) {
    throw new Error('模板变量格式无效，请使用 {{variable}}。');
  }
  return raw.replace(/{{([A-Za-z][A-Za-z0-9]*)}}/g, (_match, name: string) => {
    if (!allowed.has(name)) throw new Error('模板包含未知变量：{{' + name + '}}');
    return variables[name] ?? '';
  });
}

export async function readTemplate(app: App, path: string, variables: Record<string, string>): Promise<string> {
  validateTemplatePath(path);
  const file = app.vault.getFileByPath(path) as TFile | null;
  if (!file || file.extension !== 'md') throw new Error('找不到模板文件：' + path);
  const rendered = renderTemplate(await app.vault.read(file), variables);
  frontmatterIsValid(rendered);
  return rendered;
}
