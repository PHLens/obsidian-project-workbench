import type { VaultFile } from '../model/types';
interface CachedFile { stamp: string; file: VaultFile; }
export class ScopedFileCache {
  private contents = new Map<string, CachedFile>();
  async load<T extends { path: string; stat: { mtime: number; size?: number } }>(files: T[], read: (file: T) => Promise<string>, forcePaths: Set<string> = new Set(), keepLoading: () => boolean = () => true): Promise<VaultFile[]> {
    if (!keepLoading()) return [];
    const active = new Set(files.map((file) => file.path));
    for (const path of this.contents.keys()) if (!active.has(path)) this.contents.delete(path);
    const out: VaultFile[] = [];
    for (const file of files) {
      if (!keepLoading()) return out;
      const stamp = `${file.stat.mtime}:${file.stat.size ?? ''}`;
      let entry = this.contents.get(file.path);
      if (!entry || entry.stamp !== stamp || forcePaths.has(file.path)) {
        const content = await read(file);
        if (!keepLoading()) return out;
        const cachedFile = entry?.file.content === content ? entry.file : { path: file.path, content, mtime: file.stat.mtime };
        cachedFile.mtime = file.stat.mtime;
        entry = { stamp, file: cachedFile };
        this.contents.set(file.path, entry);
      }
      out.push(entry.file);
    }
    return out;
  }
}
