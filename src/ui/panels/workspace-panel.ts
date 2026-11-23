import type { ProjectSnapshot } from '../../model/types';
import type { WorkbenchPanel } from '../../model/view-state';
export interface PanelState { kind: WorkbenchPanel; regions?: string[]; fields?: string[]; items?: string[]; openPath?: string; }
export function renderPanelState(panel: WorkbenchPanel, snapshot: ProjectSnapshot): PanelState {
  if (panel === 'workspace') return { kind: panel, regions: ['sidebar', 'main', 'right-rail'] };
  if (panel === 'goals') return { kind: panel, fields: ['current_gate', 'next_milestone', 'success_criteria'] };
  if (panel === 'records') return { kind: panel, items: snapshot.records.map((record) => record.title) };
  if (panel === 'inbox') return { kind: panel, items: snapshot.pendingInputs.map((input) => input.title) };
  return { kind: panel, openPath: snapshot.project.path };
}
