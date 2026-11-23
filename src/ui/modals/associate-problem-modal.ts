import { App, Modal, Notice } from 'obsidian';

export class AssociateProblemModal extends Modal {
  constructor(app: App, private readonly problems: Array<{ path: string; title: string }>, private readonly submit: (path: string, focus: boolean) => Promise<void>) { super(app); }
  onOpen(): void {
    this.titleEl.setText('关联已有研究问题');
    const select = this.contentEl.createEl('select'); select.style.width = '100%';
    for (const problem of this.problems) select.createEl('option', { value: problem.path, text: problem.title });
    const focus = this.contentEl.createEl('input', { type: 'checkbox' });
    const label = this.contentEl.createEl('label', { text: ' 同时设为本阶段焦点' }); label.prepend(focus);
    const button = this.contentEl.createEl('button', { cls: 'mod-cta', text: '关联到当前项目' });
    button.onclick = async () => { if (!select.value) { new Notice('没有可关联的问题。'); return; } await this.submit(select.value, focus.checked); this.close(); };
  }
  onClose(): void { this.contentEl.empty(); }
}
