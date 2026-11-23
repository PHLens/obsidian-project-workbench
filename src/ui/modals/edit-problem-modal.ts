import { App, Modal, Notice } from 'obsidian';

export interface EditProblemResult { status: string; stage: string; researchRole: string; }

export class EditProblemModal extends Modal {
  constructor(app: App, private readonly initial: EditProblemResult, private readonly submit: (result: EditProblemResult) => Promise<void>) { super(app); }
  onOpen(): void {
    this.titleEl.setText('编辑研究问题');
    const status = this.contentEl.createEl('input', { type: 'text', placeholder: '状态', value: this.initial.status });
    const stage = this.contentEl.createEl('input', { type: 'text', placeholder: '阶段', value: this.initial.stage });
    const role = this.contentEl.createEl('input', { type: 'text', placeholder: '资源角色', value: this.initial.researchRole });
    for (const input of [status, stage, role]) { input.style.width = '100%'; input.style.marginBottom = '8px'; }
    const button = this.contentEl.createEl('button', { cls: 'mod-cta', text: '保存问题属性' });
    button.onclick = async () => { if (!status.value.trim() || !stage.value.trim() || !role.value.trim()) { new Notice('状态、阶段和资源角色不能为空。'); return; } await this.submit({ status: status.value.trim(), stage: stage.value.trim(), researchRole: role.value.trim() }); this.close(); };
    status.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
