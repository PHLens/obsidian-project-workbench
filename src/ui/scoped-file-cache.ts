import type { VaultFile } from '../model/types';
interface CachedFile { stamp: string; file: VaultFile; }
export class ScopedFileCache {
  private contents = new Map<string, CachedFile>();
  async load<T extends { path: string; stat: { mtime: number; size?: number } }>(files: T[], read: (file: T) => Promise<string>, forcePaths: Set<string> = new Set()): Promise<VaultFile[]> {
    const active = new Set(files.map((file) => file.path));
    for (const path of this.contents.keys()) if (!active.has(path)) this.contents.delete(path);
    const out: VaultFile[] = [];
    for (const file of files) {
      const stamp = `${file.stat.mtime}:${file.stat.size ?? ''}`;
      let entry = this.contents.get(file.path);
      if (!entry || entry.stamp !== stamp || forcePaths.has(file.path)) {
        entry = { stamp, file: { path: file.path, content: await read(file), mtime: file.stat.mtime } };
        this.contents.set(file.path, entry);
      }
      out.push(entry.file);
    }
    return out;
  }
}
