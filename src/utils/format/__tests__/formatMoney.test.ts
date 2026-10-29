import {LANGUAGE} from '@/src/i18n/translations';
import {RecurringItem} from '@/src/types/importApi';
import {
  formatMinorAmount,
  formatMoney,
  formatMonthlyTotal,
  sumMinorAmounts
} from '@/src/utils/format/formatMoney';

const MOCK_ITEMS: RecurringItem[] = [
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

describe('money in minor units', () => {
  it('sums integers, never floats', () => {
    expect(sumMinorAmounts(MOCK_ITEMS)).toBe(15199);
    expect(sumMinorAmounts([])).toBe(0);
  });

  it('gives the monthly total of the mock report in both languages', () => {
    expect(formatMonthlyTotal(MOCK_ITEMS, 'AUD', LANGUAGE.EN)).toBe('151.99 AUD / month');
    expect(formatMonthlyTotal(MOCK_ITEMS, 'AUD', LANGUAGE.RU)).toBe('151,99 AUD в месяц');
  });

  it('formats one payment with the decimal separator of the language', () => {
    expect(formatMoney(1999, 'AUD', LANGUAGE.EN)).toBe('19.99 AUD');
    expect(formatMoney(13200, 'AUD', LANGUAGE.RU)).toBe('132,00 AUD');
  });

  it('groups thousands and keeps the sign', () => {
    expect(formatMinorAmount(123456789, LANGUAGE.EN)).toBe('1,234,567.89');
    expect(formatMinorAmount(123456789, LANGUAGE.RU)).toBe('1 234 567,89');
    expect(formatMinorAmount(-5, LANGUAGE.EN)).toBe('-0.05');
  });
});
