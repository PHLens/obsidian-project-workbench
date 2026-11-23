export type WorkbenchPanel = 'workspace' | 'goals' | 'records' | 'inbox' | 'project-note';
export type WorkbenchDensity = 'comfortable' | 'standard' | 'compact';

export interface WorkbenchViewState {
  projectPath: string;
  panel: WorkbenchPanel;
  query: string;
  fullText: boolean;
  problemFilter: 'all' | 'focus';
  status: string[];
  stage: string[];
  researchRole: string[];
  sources: string[];
  includeArchived: boolean;
  density: WorkbenchDensity;
}

export const DEFAULT_WORKBENCH_STATE: Omit<WorkbenchViewState, 'projectPath'> = {
  panel: 'workspace', query: '', fullText: false, problemFilter: 'all', status: [], stage: [],
  researchRole: [], sources: [], includeArchived: false, density: 'comfortable',
};
