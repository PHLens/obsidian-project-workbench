import type { WorkbenchDensity } from '../model/view-state';
import { DEFAULT_DATA_SCOPE } from '../model/data-scope';
import { normalizeColumnPreferences, type ColumnPreferences } from './column-layout';
import { DEFAULT_TEMPLATE_PATHS, type TemplatePaths } from './template-renderer';
export type { WorkbenchDataScope } from '../model/data-scope';
export { DEFAULT_DATA_SCOPE, normalizeDirectoryList, isPathInDirectories } from '../model/data-scope';
export interface ResearchWorkbenchSettings { density: WorkbenchDensity; accentMode: 'theme' | 'indigo'; tagMode: 'full' | 'compact' | 'icon'; rightRail: 'fixed' | 'collapsible' | 'stacked'; iconStyle: 'linear' | 'solid'; columnLayout: ColumnPreferences; templatePaths: TemplatePaths; projectDirectories: string[]; problemDirectories: string[]; taskDirectories: string[]; inputDirectories: string[]; recordDirectories: string[]; }
export const DEFAULT_SETTINGS: ResearchWorkbenchSettings = { density: 'comfortable', accentMode: 'theme', rightRail: 'fixed', tagMode: 'full', iconStyle: 'linear', columnLayout: normalizeColumnPreferences(), templatePaths: DEFAULT_TEMPLATE_PATHS, ...DEFAULT_DATA_SCOPE };
