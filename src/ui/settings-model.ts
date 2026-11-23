import type { WorkbenchDensity } from '../model/view-state';
export interface ResearchWorkbenchSettings { density: WorkbenchDensity; accentMode: 'theme' | 'indigo'; tagMode: 'full' | 'compact' | 'icon'; rightRail: 'fixed' | 'collapsible' | 'stacked'; iconStyle: 'linear' | 'solid'; }
export const DEFAULT_SETTINGS: ResearchWorkbenchSettings = { density: 'comfortable', accentMode: 'theme', tagMode: 'full', rightRail: 'fixed', iconStyle: 'linear' };
