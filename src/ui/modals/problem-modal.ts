import { App, Modal, Notice } from 'obsidian';
import { createModalField } from './form-fields';
export interface ProblemModalResult { title: string; question: string; }
export class ProblemModal extends Modal {
  constructor(app: App, private readonly submit: (result: ProblemModalResult) => Promise<void>) { super(app); }
  onOpen(): void { this.contentEl.addClass('rw-modal-form');
    this.titleEl.setText('New research problem');
    const title=createModalField(this.contentEl,{key:'problemTitle',control:'input',required:true}).input as HTMLInputElement;
    const question=createModalField(this.contentEl,{key:'problemQuestion',control:'textarea',required:true}).input as HTMLTextAreaElement;
    const button=this.contentEl.createEl('button',{text:'Create problem',cls:'mod-cta rw-modal-button'});
    const run=async()=>{const result={title:title.value.trim(),question:question.value.trim()};if(!result.title||!result.question){new Notice('Title and question are required.');return}await this.submit(result);this.close()};
    button.onclick=()=>void run(); title.addEventListener('keydown',e=>{if((e as KeyboardEvent).key==='Enter')void run()}); title.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
