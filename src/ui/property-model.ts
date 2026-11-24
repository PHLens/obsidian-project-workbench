import type { App } from 'obsidian';
import { parseNotes } from '../model/frontmatter';
import { stringLinks } from '../model/inbox';
import type { VaultFile } from '../model/types';
import { writeFrontmatterWithExpectedHash, type WriteResult } from './vault-writes';
export type EditableProperty = 'status' | 'stage' | 'research_role' | 'tags' | 'current_gate' | 'next_milestone';
export type PropertyValue = string | string[];
export type EntityKind = 'project' | 'problem';
export const PROPERTY_LABELS: Record<EditableProperty, string> = { status: '状态', stage: '研究阶段', research_role: '资源角色', tags: '标签', current_gate: '当前门槛', next_milestone: '下一里程碑' };
const DEFAULT_CHOICES: Partial<Record<EditableProperty, string[]>> = {
  status: ['inbox', 'proposed', 'active', 'exploring', 'in-progress', 'blocked', 'completed', 'archived'],
  stage: ['inbox', 'analysis', 'evaluation', 'decision', 'completed'],
  research_role: ['mainline', 'probe', 'parked'],
};
export function getPropertySuggestions(files: VaultFile[], entity: EntityKind, field: EditableProperty): string[] {
  const values = parseNotes(files).filter((note) => note.frontmatter.type === entity).flatMap((note) => stringLinks(note.frontmatter[field]));
  return [...new Set([...(DEFAULT_CHOICES[field] ?? []), ...values])].sort((a, b) => a.localeCompare(b));
}
export function saveInlineProperty(app: App, path: string, expectedHash: string, field: EditableProperty, value: PropertyValue): Promise<WriteResult> {
  if (!Object.prototype.hasOwnProperty.call(PROPERTY_LABELS, field)) return Promise.reject(new Error('不支持修改该字段。'));
  return writeFrontmatterWithExpectedHash(app, path, expectedHash, (fm) => {
    if (field === 'tags') {
      if (!Array.isArray(value)) throw new Error('标签必须是列表。');
      const tags = [...new Set(value.map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean))];
      if (tags.some((tag) => /\s/.test(tag))) throw new Error('标签不能包含空格。');
      fm.tags = tags;
      return;
    }
    if (typeof value !== 'string') throw new Error('请输入文本值。');
    const text = value.trim();
    if (field === 'current_gate' || field === 'next_milestone') {
      const other = field === 'current_gate' ? fm.next_milestone : fm.current_gate;
      if (!text && !(typeof other === 'string' && other.trim())) throw new Error('当前门槛与下一里程碑至少保留一项。');
    } else if (!text) throw new Error(`${PROPERTY_LABELS[field]}不能为空。`);
    fm[field] = text;
  });
}
