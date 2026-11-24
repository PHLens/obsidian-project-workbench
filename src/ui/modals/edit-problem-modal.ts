import { App, Modal, Notice } from 'obsidian';
import { createModalField } from './form-fields';

export interface EditProblemResult { status: string; stage: string; researchRole: string; }

export class EditProblemModal extends Modal {
  constructor(app: App, private readonly initial: EditProblemResult, private readonly submit: (result: EditProblemResult) => Promise<void>) { super(app); }
  onOpen(): void {
    this.titleEl.setText('编辑研究问题');
    const status = createModalField(this.contentEl, { key: 'problemStatus', control: 'input', value: this.initial.status, required: true }).input as HTMLInputElement;
    const stage = createModalField(this.contentEl, { key: 'problemStage', control: 'input', value: this.initial.stage, required: true }).input as HTMLInputElement;
    const role = createModalField(this.contentEl, { key: 'researchRole', control: 'input', value: this.initial.researchRole, required: true }).input as HTMLInputElement;
    const button = this.contentEl.createEl('button', { cls: 'mod-cta rw-modal-button', text: '保存问题属性' });
    button.onclick = async () => { if (!status.value.trim() || !stage.value.trim() || !role.value.trim()) { new Notice('状态、阶段和资源角色不能为空。'); return; } await this.submit({ status: status.value.trim(), stage: stage.value.trim(), researchRole: role.value.trim() }); this.close(); };
    status.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
