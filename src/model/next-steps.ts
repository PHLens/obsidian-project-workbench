import type { Note, NextStepItem } from './types';

interface SourceLine { text: string; line: number; heading?: { level: number; text: string }; }
interface NextStepReading { items: NextStepItem[]; heading?: string; line?: number; }
interface Preview { content: string; body?: string; summary: unknown; overview?: string; steps: NextStepReading; }
const previews = new WeakMap<Note, Preview>();
function previewFor(note: Note): Preview {
  const cached = previews.get(note);
  if (cached?.content === note.content && cached.body === note.body && cached.summary === note.frontmatter.summary) return cached;
  const lines = sourceLines(note);
  const preview = { content: note.content, body: note.body, summary: note.frontmatter.summary, overview: deriveOverview(note, lines), steps: parseSteps(lines) };
  previews.set(note, preview); return preview;
}
export function readNextSteps(note: Note): NextStepReading { return previewFor(note).steps; }
export function problemOverview(note: Note): string | undefined { return previewFor(note).overview; }

function sourceLines(note: Note): SourceLine[] {
  const body = note.body ?? note.content;
  const offset = note.content.slice(0, note.content.length - body.length).split('\n').length - 1;
  const lines: SourceLine[] = [];
  let fence = '';
  for (const [index, text] of body.split(/\r?\n/).entries()) {
    const marker = text.match(/^[ \t]*(\x60{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = '';
      continue;
    }
    if (marker) { fence = marker[1]; continue; }
    const heading = text.match(/^ {0,3}(#{1,6})[ \t]+(.+)$/);
    lines.push({ text, line: offset + index, heading: heading ? { level: heading[1].length, text: heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim() } : undefined });
  }
  return lines;
}

function parseSteps(lines: SourceLine[]): NextStepReading {
  const start = lines.findIndex(({ heading }) => heading?.level === 2 && /^(?:Next Steps?|下一步)$/i.test(heading.text));
  if (start < 0) return { items: [] };
  const items: NextStepItem[] = [];
  let continuation = false;
  for (const source of lines.slice(start + 1)) {
    if (source.heading && source.heading.level <= 2) break;
    const item = source.text.match(/^([ \t]*)(?:[-+*]|\d+[.)])[ \t]+(?:\[([ xX])\][ \t]+)?(.+)$/);
    if (item) {
      items.push({ text: item[3].trim(), ...(item[2] === undefined ? {} : { completed: item[2].toLowerCase() === 'x' }), depth: Math.floor(item[1].replace(/\t/g, '    ').length / 2), line: source.line });
      continuation = true;
    } else if (continuation && source.text.trim() && !source.heading && items.length) {
      items[items.length - 1].text += ' ' + source.text.trim();
    } else if (!source.text.trim() || source.heading) continuation = false;
  }
  return { items, heading: lines[start].heading!.text, line: lines[start].line };
}

function deriveOverview(note: Note, lines: SourceLine[]): string | undefined {
  if (typeof note.frontmatter.summary === 'string' && note.frontmatter.summary.trim()) return note.frontmatter.summary.trim();
  const start = lines.findIndex(({ heading }) => heading?.level === 2 && /^(?:Overview|概述|问题概述)$/i.test(heading.text));
  const candidates = start >= 0 ? lines.slice(start + 1) : lines;
  const paragraph: string[] = [];
  for (const { text, heading } of candidates) {
    if (heading) {
      if (heading.level <= 2 && !(start < 0 && heading.level === 1 && !paragraph.length)) break;
      continue;
    }
    if (!text.trim()) { if (paragraph.length) break; continue; }
    if (/^\s*(?:[-+*>]|\d+[.)])\s|^\s*---\s*$/.test(text)) { if (paragraph.length) break; continue; }
    paragraph.push(text.trim());
  }
  return paragraph.join(' ') || undefined;
}
