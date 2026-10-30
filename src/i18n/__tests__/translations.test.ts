import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';

describe('translations', () => {
  it('names the file size limit in the rejection text of both languages', () => {
    expect(TRANSLATIONS[LANGUAGE.EN].importConfirm.rejection.too_large).toBe(
      'This file is larger than 10 MB.'
    );
    expect(TRANSLATIONS[LANGUAGE.RU].importConfirm.rejection.too_large).toBe('Файл больше 10 МБ.');
  });

  it('picks the Russian word form by the last digits, with the teens always in the many form', () => {
    const {repeatingPayments} = TRANSLATIONS[LANGUAGE.RU].common;
    expect(repeatingPayments(1)).toBe('1 повторяющийся платёж');
    expect(repeatingPayments(21)).toBe('21 повторяющийся платёж');
    expect(repeatingPayments(2)).toBe('2 повторяющихся платежа');
    expect(repeatingPayments(24)).toBe('24 повторяющихся платежа');
    expect(repeatingPayments(5)).toBe('5 повторяющихся платежей');
    expect(repeatingPayments(11)).toBe('11 повторяющихся платежей');
    expect(repeatingPayments(14)).toBe('14 повторяющихся платежей');
    expect(repeatingPayments(112)).toBe('112 повторяющихся платежей');
  });

  it('picks the English word form by the count', () => {
    const {repeatingPayments} = TRANSLATIONS[LANGUAGE.EN].common;
    expect(repeatingPayments(1)).toBe('1 repeating payment');
    expect(repeatingPayments(2)).toBe('2 repeating payments');
  });
});
