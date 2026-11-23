import type { SourceRef } from '../../model/types';

export function renderSourceTags(container: HTMLElement, sources: SourceRef[], extra: string[] = []): HTMLElement {
  const wrap = container.createDiv({ cls: 'rw-source-tags' });
  for (const source of sources) wrap.createSpan({ cls: `rw-source-tag rw-source-${source.kind}`, text: source.label ?? source.kind });
  for (const label of extra) wrap.createSpan({ cls: 'rw-source-tag rw-source-extra', text: label });
  return wrap;
}
