import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {
  appendTimelineEntry,
  TIMELINE_EVENT,
  TimelineEntry
} from '@/src/utils/import/importTimeline';

const at = (second: number) => `2026-10-29T14:32:${String(second).padStart(2, '0')}.000Z`;

const add = (
  entries: TimelineEntry[],
  id: number,
  event: TIMELINE_EVENT,
  revision: number | null = null
) =>
  appendTimelineEntry(
    entries,
    {operationId: 'op-1', event, status: IMPORT_STATUS.PROCESSING, revision},
    {id, at: at(id), limit: 3}
  );

describe('appendTimelineEntry', () => {
  it('folds the same unchanged answer into one row with a counter', () => {
    const once = add([], 1, TIMELINE_EVENT.STATUS_UNCHANGED, 2);
    const twice = add(once, 2, TIMELINE_EVENT.STATUS_UNCHANGED, 2);
    expect(twice).toHaveLength(1);
    expect(twice[0]).toMatchObject({repeats: 2, at: at(2)});
  });

  it('never folds a skipped stale answer: every one stays visible', () => {
    const once = add([], 1, TIMELINE_EVENT.STATUS_STALE_SKIPPED, 2);
    expect(add(once, 2, TIMELINE_EVENT.STATUS_STALE_SKIPPED, 2)).toHaveLength(2);
  });

  it('keeps only the newest rows within the limit', () => {
    const entries = [1, 2, 3, 4].reduce<TimelineEntry[]>(
      (list, id) => add(list, id, TIMELINE_EVENT.STATUS_APPLIED, id),
      []
    );
    expect(entries.map((entry) => entry.revision)).toEqual([2, 3, 4]);
  });
});
