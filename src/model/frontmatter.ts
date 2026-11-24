import { parse } from 'yaml';
import type { Note, VaultFile } from './types';

interface ParsedNoteEntry { content: string; note: Note; }
const parsedNotes = new WeakMap<VaultFile, ParsedNoteEntry>();

export function parseNote(file: VaultFile): Note {
  const cached = parsedNotes.get(file);
  if (cached?.content === file.content) {
    if (cached.note.path !== file.path || cached.note.mtime !== file.mtime) cached.note = { ...cached.note, path: file.path, mtime: file.mtime };
    return cached.note;
  }
  const match = file.content.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  const frontmatter = match ? (parse(match[1]) ?? {}) : {};
  const body = match ? file.content.slice(match[0].length) : file.content;
  const note = { ...file, frontmatter: typeof frontmatter === 'object' && frontmatter ? frontmatter : {}, body };
  parsedNotes.set(file, { content: file.content, note });
  return note;
}

export function parseNotes(files: VaultFile[]): Note[] { return files.map(parseNote); }

export function titleFor(note: Note): string {
  const title = note.frontmatter.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return note.path.split('/').pop()?.replace(/\.md$/, '') ?? note.path;
}

export function firstHeading(note: Note): string | undefined {
  return note.body?.match(/^#\s+(.+)$/m)?.[1]?.trim();
}
