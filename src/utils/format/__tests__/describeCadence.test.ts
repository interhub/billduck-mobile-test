import {LANGUAGE} from '@/src/i18n/translations';
import {describeCadence} from '@/src/utils/format/describeCadence';

describe('describeCadence', () => {
  it('names the cadences the app knows in both languages', () => {
    expect(describeCadence('monthly', LANGUAGE.EN)).toBe('Monthly');
    expect(describeCadence('weekly', LANGUAGE.RU)).toBe('Еженедельно');
    expect(describeCadence('yearly', LANGUAGE.RU)).toBe('Ежегодно');
  });

  it('shows a cadence the app does not know as the server sent it', () => {
    expect(describeCadence('quarterly', LANGUAGE.EN)).toBe('quarterly');
  });
});
