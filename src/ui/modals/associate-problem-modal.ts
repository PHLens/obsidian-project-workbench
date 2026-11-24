import { App, Modal, Notice } from 'obsidian';
import { createModalField } from './form-fields';

export class AssociateProblemModal extends Modal {
  constructor(app: App, private readonly problems: Array<{ path: string; title: string }>, private readonly submit: (path: string, focus: boolean) => Promise<void>) { super(app); }
  onOpen(): void { this.contentEl.addClass('rw-modal-form');
    this.titleEl.setText('关联已有研究问题');
    const select = createModalField(this.contentEl, { key: 'associateProblem', control: 'select', required: true }).input as HTMLSelectElement;
    for (const problem of this.problems) select.createEl('option', { value: problem.path, text: problem.title });
    const focusField = this.contentEl.createDiv({ cls: 'rw-form-field rw-form-checkbox-field' });
    const focus = focusField.createEl('input', { type: 'checkbox' });
    const label = focusField.createEl('label', { cls: 'rw-form-label', text: '同时设为本阶段焦点' }); label.prepend(focus);
    focusField.createEl('small', { cls: 'rw-form-description', text: '勾选后，这个问题会出现在当前阶段焦点区域。' });
    const button = this.contentEl.createEl('button', { cls: 'mod-cta rw-modal-button', text: '关联到当前项目' });
    button.onclick = async () => { if (!select.value) { new Notice('没有可关联的问题。'); return; } await this.submit(select.value, focus.checked); this.close(); };
  }
  onClose(): void { this.contentEl.empty(); }
}
