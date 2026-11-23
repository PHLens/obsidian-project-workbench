import type { ProjectSummary } from '../../model/types';
import type { WorkbenchPanel, WorkbenchViewState } from '../../model/view-state';
import type { WorkbenchActions } from './workbench-shell';
import { renderIcon } from './icon';

export function renderProjectSidebar(container: HTMLElement, projects: ProjectSummary[], state: WorkbenchViewState, actions: WorkbenchActions): HTMLElement {
  const aside = container.createDiv({ cls: 'rw-sidebar' });
  const projectGroup = aside.createDiv({ cls: 'rw-sidebar-group' });
  projectGroup.createEl('div', { cls: 'rw-sidebar-label', text: '研究项目' });
  for (const project of projects) {
    const button = projectGroup.createEl('button', { cls: `rw-project-choice ${project.path === state.projectPath ? 'is-active' : ''}` });
    const projectIcon = button.createSpan({ cls: 'rw-project-choice-icon' }); renderIcon(projectIcon, 'network');
    button.createSpan({ cls: 'rw-project-choice-name', text: project.title });
    button.createSpan({ cls: 'rw-project-choice-arrow', text: '›' });
    button.onclick = () => actions.selectProject(project.path);
    if (project.path === state.projectPath) {
      const menu = projectGroup.createEl('button', { cls: 'rw-project-actions', text: '⋯ 项目操作' });
      menu.onclick = (event) => { event.stopPropagation(); actions.projectActions(project.path); };
    }
  }
  projectGroup.createEl('button', { cls: 'rw-sidebar-action', text: '＋  新建项目' }).onclick = actions.createProject;
  aside.createDiv({ cls: 'rw-sidebar-rule' });
  const nav = aside.createDiv({ cls: 'rw-sidebar-nav' });
  const entries: Array<[WorkbenchPanel, string, string]> = [
    ['workspace', 'layout-dashboard', '项目工作台'], ['goals', 'flag', '阶段目标'], ['records', 'clock-3', '进展记录'], ['inbox', 'inbox', '收件箱'],
  ];
  for (const [panel, icon, label] of entries) {
    const item = nav.createEl('button', { cls: `rw-nav-item ${state.panel === panel ? 'is-active' : ''}` });
    const navIcon = item.createSpan({ cls: 'rw-nav-icon' }); renderIcon(navIcon, icon); item.createSpan({ text: label }); item.onclick = () => actions.selectPanel(panel);
  }
  aside.createDiv({ cls: 'rw-sidebar-spacer' });
  const note = aside.createEl('button', { cls: `rw-nav-item ${state.panel === 'project-note' ? 'is-active' : ''}` });
  const noteIcon = note.createSpan({ cls: 'rw-nav-icon' }); renderIcon(noteIcon, 'file-text'); note.createSpan({ text: '项目笔记' }); note.onclick = actions.openProjectNote;
  aside.createEl('small', { cls: 'rw-sidebar-hint', text: '链接到 Obsidian 原文' });
  return aside;
}
