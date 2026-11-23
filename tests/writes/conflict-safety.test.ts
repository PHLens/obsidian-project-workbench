import { describe, expect, it } from 'vitest';
import { sha256, assertExpectedHash, validateMarkdownPath, preflightProjectBundle } from '../../src/ui/vault-writes';

describe('CRUD conflict safety', () => {
  it('rejects stale content before writes', () => expect(() => assertExpectedHash('current', sha256('old'))).toThrow('冲突'));
  it('rejects config, traversal, and non-Markdown paths', () => {
    expect(() => validateMarkdownPath('../outside.md')).toThrow();
    expect(() => validateMarkdownPath('.obsidian/app.json')).toThrow();
    expect(() => validateMarkdownPath('Spaces/Research/Projects/P.md')).not.toThrow();
  });
  it('preflights duplicate project paths before creating either file', () => expect(() => preflightProjectBundle({ projectExists: true, problemExists: false })).toThrow('已存在'));
});
