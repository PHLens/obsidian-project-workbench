import type { App } from 'obsidian';
import { vi } from 'vitest';
import { TFile } from './obsidian-dom';
export function interactiveVault(initial: Record<string, string>) {
  const contents = new Map(Object.entries(initial));
  const files = new Map([...contents.keys()].map((path) => [path, new TFile(path)]));
  const handlers = new Map<string, (file: TFile) => void>();
  let stamp = 2;
  const read = vi.fn(async (file: { path: string }) => { const text = contents.get(file.path); if (text === undefined) throw new Error('Missing file'); return text; });
  const modify = vi.fn(async (file: TFile, text: string) => { contents.set(file.path, text); file.stat.mtime = stamp++; file.stat.size = text.length; handlers.get('modify')?.(file); });
  const create = vi.fn(async (path: string, text: string) => { if (contents.has(path)) throw new Error('Already exists'); const file = new TFile(path); contents.set(path, text); files.set(path, file); file.stat.mtime = stamp++; handlers.get('create')?.(file); return file; });
  const openFile = vi.fn(async () => {});
  const app = { vault: { getMarkdownFiles: () => [...files.values()], read, modify, create, getFileByPath: (path: string) => files.get(path) ?? null,
    getAbstractFileByPath: (path: string) => files.get(path) ?? (['Inputs', 'Projects', 'Problems'].includes(path) ? { path, children: [] } : null),
    on: (event: string, handler: (file: TFile) => void) => { handlers.set(event, handler); return {}; } },
    workspace: { getLeaf: () => ({ openFile }) }, metadataCache: { getFileCache: () => ({ frontmatter: {} }) } } as unknown as App;
  return { app, contents, files, read, modify, create, openFile, handlers };
}
