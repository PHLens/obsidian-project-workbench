import type { ProjectSnapshot } from '../../model/types';
import { renderPropertyButton } from '../components/property-button';
import type { EditableProperty } from '../property-model';
export function renderGoalsPanel(container: HTMLElement, snapshot: ProjectSnapshot, onEdit: () => void, onEditField?: (field: EditableProperty, anchor: HTMLElement) => void): HTMLElement {
  const panel = container.createDiv({ cls: 'rw-panel rw-goals-panel' }); panel.createEl('h2', { text: '阶段目标' }); panel.createEl('p', { cls: 'rw-panel-lead', text: snapshot.project.goal ?? '目标待补充' });
  for (const [field, label, value] of [['current_gate', '当前门槛', snapshot.project.currentGate], ['next_milestone', '下一里程碑', snapshot.project.nextMilestone]] as const) {
    const row = panel.createDiv({ cls: 'rw-goal-row' }); row.createEl('small', { text: label });
    if (onEditField) renderPropertyButton(row, { path: snapshot.project.path, field, label, value: value ?? '', onEdit: (anchor) => onEditField(field, anchor) });
    else row.createEl('strong', { text: value ?? '待补充' });
  }
  panel.createEl('button', { cls: 'rw-button', text: '编辑阶段目标' }).onclick = onEdit; return panel;
}
