import {
  MOCK_READY_CURRENCY,
  MOCK_READY_ITEMS
} from '@/src/api/importsApi/__tests__/mockReadyReport';
import {LANGUAGE} from '@/src/i18n/translations';
import {
  formatMinorAmount,
  formatMoney,
  formatMonthlyTotal,
  sumMinorAmounts
} from '@/src/utils/format/formatMoney';

describe('money in minor units', () => {
  it('sums integers, never floats', () => {
    expect(sumMinorAmounts(MOCK_READY_ITEMS)).toBe(15199);
    expect(sumMinorAmounts([])).toBe(0);
  });

  it('gives the monthly total of the mock report in both languages', () => {
    expect(formatMonthlyTotal(MOCK_READY_ITEMS, MOCK_READY_CURRENCY, LANGUAGE.EN)).toBe(
      '151.99 AUD / month'
    );
    expect(formatMonthlyTotal(MOCK_READY_ITEMS, MOCK_READY_CURRENCY, LANGUAGE.RU)).toBe(
      '151,99 AUD в месяц'
    );
  });

  it('formats one payment with the decimal separator of the language', () => {
    expect(formatMoney(1999, 'AUD', LANGUAGE.EN)).toBe('19.99 AUD');
    expect(formatMoney(13200, 'AUD', LANGUAGE.RU)).toBe('132,00 AUD');
  });

  it('groups thousands and keeps the sign', () => {
    expect(formatMinorAmount(123456789, LANGUAGE.EN)).toBe('1,234,567.89');
    expect(formatMinorAmount(123456789, LANGUAGE.RU)).toBe('1\u00A0234\u00A0567,89');
    expect(formatMinorAmount(-5, LANGUAGE.EN)).toBe('-0.05');
  });
});
