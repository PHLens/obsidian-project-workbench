export interface WorkbenchDataScope {
  projectDirectories: string[];
  problemDirectories: string[];
  taskDirectories: string[];
  inputDirectories: string[];
  recordDirectories: string[];
}

export const DEFAULT_DATA_SCOPE: WorkbenchDataScope = {
  projectDirectories: [],
  problemDirectories: [],
  taskDirectories: [],
  inputDirectories: [],
  recordDirectories: [],
};

export function normalizeDirectoryList(value: string | string[]): string[] {
  const values = Array.isArray(value) ? value : value.split(',');
  return [...new Set(values.map((item) => item.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean))];
}

export function isPathInDirectories(path: string, directories: string[]): boolean {
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizeDirectoryList(directories).some((directory) => normalizedPath === directory || normalizedPath.startsWith(`${directory}/`));
}

export function resolveDataScope(scope: Partial<WorkbenchDataScope> = {}): WorkbenchDataScope {
  return {
    projectDirectories: normalizeDirectoryList(scope.projectDirectories ?? DEFAULT_DATA_SCOPE.projectDirectories),
    problemDirectories: normalizeDirectoryList(scope.problemDirectories ?? DEFAULT_DATA_SCOPE.problemDirectories),
    taskDirectories: normalizeDirectoryList(scope.taskDirectories ?? DEFAULT_DATA_SCOPE.taskDirectories),
    inputDirectories: normalizeDirectoryList(scope.inputDirectories ?? DEFAULT_DATA_SCOPE.inputDirectories),
    recordDirectories: normalizeDirectoryList(scope.recordDirectories ?? DEFAULT_DATA_SCOPE.recordDirectories),
  };
}

export function allDataDirectories(scope: Partial<WorkbenchDataScope> = {}): string[] {
  const resolved = resolveDataScope(scope);
  return normalizeDirectoryList([...resolved.projectDirectories, ...resolved.problemDirectories, ...resolved.taskDirectories, ...resolved.inputDirectories, ...resolved.recordDirectories]);
}
