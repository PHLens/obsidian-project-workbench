import { App, Modal, Notice } from 'obsidian';
export interface ProblemModalResult { title: string; question: string; }
export class ProblemModal extends Modal {
  constructor(app: App, private readonly submit: (result: ProblemModalResult) => Promise<void>) { super(app); }
  onOpen(): void {
    this.titleEl.setText('New research problem');
    const title=this.contentEl.createEl('input',{cls:'rw-modal-control',type:'text',placeholder:'Research problem title'});
    const question=this.contentEl.createEl('textarea',{cls:'rw-modal-textarea',placeholder:'What question should this problem answer?'});
    const button=this.contentEl.createEl('button',{text:'Create problem',cls:'mod-cta rw-modal-button'});
    const run=async()=>{const result={title:title.value.trim(),question:question.value.trim()};if(!result.title||!result.question){new Notice('Title and question are required.');return}await this.submit(result);this.close()};
    button.onclick=()=>void run(); title.addEventListener('keydown',e=>{if((e as KeyboardEvent).key==='Enter')void run()}); title.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
