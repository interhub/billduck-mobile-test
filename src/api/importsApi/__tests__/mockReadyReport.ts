import {RecurringItem} from '@/src/types/importApi';

/** The payments of every ready report of the kit's mock: 151.99 AUD a month together. */
export const MOCK_READY_ITEMS: RecurringItem[] = [
  {
    id: 'rec-001',
    merchant: 'StreamBeam',
    amountMinor: 1999,
    cadence: 'monthly',
    lastSeen: '2026-10-01'
  },
  {
    id: 'rec-002',
    merchant: 'BrightGrid',
    amountMinor: 13200,
    cadence: 'monthly',
    lastSeen: '2026-10-03'
  }
];

export const MOCK_READY_CURRENCY = 'AUD';

/** The body of a ready answer of the mock, revision 3. */
export const MOCK_READY_BODY = JSON.stringify({
  jobId: 'job-demo-001',
  status: 'ready',
  revision: 3,
  currency: MOCK_READY_CURRENCY,
  items: MOCK_READY_ITEMS
});
