import type { VaultFile } from '../model/types';
import { isPathInDirectories } from '../model/data-scope';

export function getUnassociatedProblemCandidates(files: VaultFile[], current: Set<string>, directories: string[]): Array<{ path: string; title: string }> {
  return files
    .filter((file) => file.path.endsWith('.md') && isPathInDirectories(file.path, directories) && !current.has(file.path))
    .map((file) => ({ path: file.path, title: file.path.split('/').pop()?.replace(/\.md$/, '') ?? file.path }));
}
