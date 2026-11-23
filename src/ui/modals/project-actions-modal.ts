import { App, Modal } from 'obsidian';

export class ProjectActionsModal extends Modal {
  constructor(app: App, private readonly projectTitle: string, private readonly actions: { open: () => void; archive: () => Promise<void>; trash: () => Promise<void> }) { super(app); }
  onOpen(): void {
    this.titleEl.setText(`项目：${this.projectTitle}`);
    const open = this.contentEl.createEl('button', { text: '打开项目笔记' });
    const archive = this.contentEl.createEl('button', { text: '归档项目' });
    const trash = this.contentEl.createEl('button', { text: '移入 Obsidian 回收站' });
    for (const button of [open, archive, trash]) { button.style.width = '100%'; button.style.marginBottom = '8px'; }
    open.onclick = () => { this.actions.open(); this.close(); };
    archive.onclick = async () => { await this.actions.archive(); this.close(); };
    trash.onclick = async () => { await this.actions.trash(); this.close(); };
  }
  onClose(): void { this.contentEl.empty(); }
}
