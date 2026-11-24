import { App, Modal } from 'obsidian';
import type { InboxAssociations } from '../inbox-writes';
import { createAssociationPicker, type AssociationCandidate } from '../components/association-picker';
export class InboxAssociationsModal extends Modal {
  private saving = false;
  close(): void { if (!this.saving) super.close(); }
  constructor(app: App, private readonly initial: InboxAssociations, private readonly candidates: { projects: AssociationCandidate[]; problems: AssociationCandidate[] }, private readonly submit: (links: InboxAssociations) => Promise<void>, private readonly options: { onClose?: () => void } = {}) { super(app); }
  onOpen(): void {
    this.titleEl.setText('关联项目与研究问题');
    this.contentEl.createEl('p', { cls: 'rw-muted', text: '可以选择多项；关联关系与价值确认状态独立。' });
    const projects = createAssociationPicker(this.contentEl, { label: '项目', candidates: this.candidates.projects, selected: this.initial.projects });
    const problems = createAssociationPicker(this.contentEl, { label: '研究问题', candidates: this.candidates.problems, selected: this.initial.problems });
    const error = this.contentEl.createDiv({ cls: 'rw-form-error' }); error.setAttribute('role', 'alert');
    const actions = this.contentEl.createDiv({ cls: 'modal-button-container' }); const cancel = actions.createEl('button', { text: '取消' }); cancel.onclick = () => this.close();
    const save = actions.createEl('button', { cls: 'mod-cta', text: '保存关联' }); save.dataset.action = 'save';
    save.onclick = async () => {
      if (save.disabled) return; this.saving = true; error.setText('');
      const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button'));
      const disabled = controls.map((control) => control.disabled);
      controls.forEach((control) => { control.disabled = true; });
      try { await this.submit({ projects: projects.getValue(), problems: problems.getValue() }); this.saving = false; this.close(); }
      catch (reason) { error.setText(reason instanceof Error ? reason.message : String(reason)); }
      finally { this.saving = false; controls.forEach((control, index) => { control.disabled = disabled[index]; }); }
    };
  }
  onClose(): void { this.contentEl.empty(); this.options.onClose?.(); }
}
