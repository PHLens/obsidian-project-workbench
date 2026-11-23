import { parse } from 'yaml';
import type { Note, VaultFile } from './types';

export function parseNote(file: VaultFile): Note {
  const match = file.content.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  const frontmatter = match ? (parse(match[1]) ?? {}) : {};
  const body = match ? file.content.slice(match[0].length) : file.content;
  return { ...file, frontmatter: typeof frontmatter === 'object' && frontmatter ? frontmatter : {}, body };
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
