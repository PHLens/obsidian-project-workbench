import { describe, expect, it } from 'vitest';
import { getSearchControlContract } from '../../src/ui/components/main-header';
import { getTimelineItemContract } from '../../src/ui/components/recent-timeline';

describe('search and timeline visual layering', () => {
  it('keeps the search control as one custom icon layer', () => {
    expect(getSearchControlContract()).toEqual({ inputType: 'text', role: 'searchbox', iconPointerEvents: 'none', iconCount: 1 });
  });

  it('keeps title and date inside an explicit timeline body', () => {
    expect(getTimelineItemContract()).toEqual({ bodyClass: 'rw-timeline-body', titleClass: 'rw-timeline-title', dateClass: 'rw-timeline-date' });
  });
});
