import type { WorkbenchDensity } from '../model/view-state';
import { DEFAULT_DATA_SCOPE } from '../model/data-scope';
import { normalizeColumnPreferences, type ColumnPreferences } from './column-layout';
export type { WorkbenchDataScope } from '../model/data-scope';
export { DEFAULT_DATA_SCOPE, normalizeDirectoryList, isPathInDirectories } from '../model/data-scope';
export interface ResearchWorkbenchSettings { density: WorkbenchDensity; accentMode: 'theme' | 'indigo'; tagMode: 'full' | 'compact' | 'icon'; rightRail: 'fixed' | 'collapsible' | 'stacked'; iconStyle: 'linear' | 'solid'; columnLayout: ColumnPreferences; projectDirectories: string[]; problemDirectories: string[]; taskDirectories: string[]; inputDirectories: string[]; recordDirectories: string[]; }
export const DEFAULT_SETTINGS: ResearchWorkbenchSettings = { density: 'comfortable', accentMode: 'theme', tagMode: 'full', rightRail: 'fixed', iconStyle: 'linear', columnLayout: normalizeColumnPreferences(), ...DEFAULT_DATA_SCOPE };
