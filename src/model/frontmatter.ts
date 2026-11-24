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

export async function primeParsedNotes(files: VaultFile[], keepGoing: () => boolean = () => true, yieldControl: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 0))): Promise<boolean> {
  if (!keepGoing()) return false;
  let decoded = 0;
  for (const file of files) {
    const uncached = parsedNotes.get(file)?.content !== file.content;
    if (uncached && decoded >= 24) {
      await yieldControl(); decoded = 0;
      if (!keepGoing()) return false;
    }
    parseNote(file);
    if (uncached) decoded++;
  }
  return keepGoing();
}
