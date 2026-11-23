import { readFileSync, readdirSync, lstatSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { VaultFile } from '../../src/model/types';

export function readMarkdownFiles(root: string): VaultFile[] {
  const out: VaultFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const full = join(dir, entry);
      let info;
      try { info = lstatSync(full); } catch { continue; }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) walk(full);
      else if (entry.endsWith('.md')) out.push({ path: relative(root, full).replaceAll('\\', '/'), content: readFileSync(full, 'utf8') });
    }
  };
  walk(root); return out;
}
