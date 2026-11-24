import { App, Modal } from 'obsidian';
import type { InputKind } from '../../model/inbox';
import type { InboxCaptureInput } from '../inbox-writes';
import { createAssociationPicker, type AssociationCandidate } from '../components/association-picker';
import { createModalField } from './form-fields';
export interface CaptureContext { projectPath?: string; problemPath?: string; }
export interface CaptureCandidates { projects: AssociationCandidate[]; problems: AssociationCandidate[]; notes: AssociationCandidate[]; }
export interface InboxCaptureOptions { mode: 'new' | 'reference'; kind?: InputKind; context?: CaptureContext; candidates: CaptureCandidates; submit: (input: InboxCaptureInput) => Promise<void>; }
export class InboxCaptureModal extends Modal {
  constructor(app: App, private readonly options: InboxCaptureOptions) { super(app); }
  onOpen(): void {
    this.titleEl.setText(this.options.mode === 'reference' ? '引用已有笔记' : '新增资料');
    const form = this.contentEl;
    const title = createModalField(form, { key: 'captureTitle', control: 'input', required: true }).input as HTMLInputElement; title.name = 'title';
    const kind = createModalField(form, { key: 'captureKind', control: 'select' }).input as HTMLSelectElement;
    for (const [value, label] of [['idea', '想法'], ['paper', '论文'], ['note', '笔记']]) kind.createEl('option', { value, text: label });
    kind.value = this.options.kind ?? (this.options.mode === 'reference' ? 'note' : 'idea'); kind.name = 'kind';
    let selectedNote: AssociationCandidate | undefined;
    if (this.options.mode === 'reference') {
      const group = form.createDiv({ cls: 'rw-form-field' }); group.createEl('label', { cls: 'rw-form-label', text: '选择原笔记' });
      const search = group.createEl('input', { cls: 'rw-modal-control rw-note-search', type: 'search', placeholder: '搜索笔记标题或路径' }); search.setAttribute('aria-label', '搜索已有笔记');
      const selected = group.createDiv({ cls: 'rw-reference-selection' });
      const list = group.createDiv({ cls: 'rw-association-results' });
      const render = () => {
        list.empty(); const query = search.value.trim().toLocaleLowerCase();
        const choices = this.options.candidates.notes.filter((item) => `${item.title} ${item.path}`.toLocaleLowerCase().includes(query));
        for (const note of choices.slice(0, 20)) {
          const button = list.createEl('button', { cls: 'rw-note-result', text: `${note.title} · ${note.path}` });
          button.type = 'button'; button.onclick = () => { if (!title.value || title.value === selectedNote?.title) title.value = note.title; selectedNote = note; selected.setText(`已选择：${note.path}`); };
        }
        if (!choices.length) list.createEl('small', { text: '没有匹配的笔记。' });
      };
      search.oninput = render; render();
    }
    const content = createModalField(form, { key: 'captureContent', control: 'textarea' }).input as HTMLTextAreaElement; content.name = 'content';
    const source = this.options.mode === 'new' ? createModalField(form, { key: 'pendingSource', control: 'input' }).input as HTMLInputElement : undefined;
    if (source) source.name = 'source';
    const projects = createAssociationPicker(form, { label: '关联项目（可选）', candidates: this.options.candidates.projects, selected: this.options.context?.projectPath ? [`[[${this.options.context.projectPath}]]`] : [] });
    const problems = createAssociationPicker(form, { label: '关联研究问题（可选）', candidates: this.options.candidates.problems, selected: this.options.context?.problemPath ? [`[[${this.options.context.problemPath}]]`] : [] });
    const error = form.createDiv({ cls: 'rw-form-error' }); error.setAttribute('role', 'alert');
    const actions = form.createDiv({ cls: 'modal-button-container' }); const cancel = actions.createEl('button', { text: '取消' }); cancel.onclick = () => this.close();
    const save = actions.createEl('button', { cls: 'mod-cta', text: '加入收件箱' }); save.dataset.action = 'save';
    let saving = false;
    const submit = async () => {
      if (saving) return;
      error.setText('');
      if (!title.value.trim()) { error.setText('请输入资料标题。'); title.focus(); return; }
      if (this.options.mode === 'reference' && !selectedNote) { error.setText('请选择要引用的原笔记。'); return; }
      saving = true; save.disabled = true; cancel.disabled = true;
      try {
        await this.options.submit({ title: title.value.trim(), kind: kind.value as InputKind, content: content.value.trim(), sourceValue: selectedNote ? `[[${selectedNote.path}]]` : source?.value.trim() ?? '', projects: projects.getValue(), problems: problems.getValue() });
        this.close();
      } catch (reason) { error.setText(reason instanceof Error ? reason.message : String(reason)); }
      finally { saving = false; save.disabled = false; cancel.disabled = false; }
    };
    save.onclick = () => void submit();
    form.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); void submit(); } });
    title.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
