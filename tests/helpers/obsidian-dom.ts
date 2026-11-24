import type { App, WorkspaceLeaf } from 'obsidian';
export class Modal {
  app: App;
  containerEl: HTMLElement;
  contentEl: HTMLElement;
  titleEl: HTMLElement;
  constructor(app: App) {
    this.app = app;
    this.containerEl = document.createElement('div'); this.containerEl.className = 'modal-container';
    this.titleEl = this.containerEl.createEl('h2'); this.contentEl = this.containerEl.createDiv({ cls: 'modal-content' });
  }
  open() { document.body.appendChild(this.containerEl); this.onOpen(); }
  close() { this.onClose(); this.containerEl.remove(); }
  onOpen() {}
  onClose() {}
}
export class ItemView {
  app: App;
  contentEl: HTMLElement;
  constructor(leaf: WorkspaceLeaf & { app: App }) { this.app = leaf.app; this.contentEl = document.createElement('div'); document.body.appendChild(this.contentEl); }
  registerEvent() {}
}
export class TFile { path: string; basename: string; extension = 'md'; stat = { mtime: 1, size: 1 }; constructor(path: string) { this.path = path; this.basename = path.split('/').pop()!.replace(/\.md$/, ''); } }
export class Notice { constructor(public message: string) {} }
export class Menu {}
export class ConfirmationModal extends Modal {}
