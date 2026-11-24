import type { App } from 'obsidian';
import { vi } from 'vitest';
export function memoryVault(initial: Record<string, string>, folders = ['Inputs']) {
  const contents = new Map(Object.entries(initial));
  const file = (path: string) => contents.has(path) ? { path, basename: path.split('/').pop()!.replace(/\.md$/, ''), extension: 'md' } : null;
  const read = vi.fn(async (item: { path: string }) => { if (!contents.has(item.path)) throw new Error('Missing file'); return contents.get(item.path)!; });
  const modify = vi.fn(async (item: { path: string }, value: string) => { contents.set(item.path, value); });
  const create = vi.fn(async (path: string, value: string) => { if (contents.has(path)) throw new Error('File exists'); contents.set(path, value); return file(path); });
  const process = vi.fn(async (item: { path: string }, transform: (raw: string) => string) => { const next = transform(contents.get(item.path)!); await modify(item, next); return next; });
  const app = { vault: { read, modify, create, process, getFileByPath: file, getAbstractFileByPath: (path: string) => folders.includes(path) ? { path, children: [] } : file(path) } } as unknown as App;
  return { app, contents, read, modify, create };
}
