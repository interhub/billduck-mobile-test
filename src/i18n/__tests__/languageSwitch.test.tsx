import {act, render, screen} from '@testing-library/react-native';
import {getLocales} from 'expo-localization';
import {AppState, AppStateStatus} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';
import {useAppStateWatcher} from '@/src/hooks/sensors/useAppStateWatcher';
import {LANGUAGE} from '@/src/i18n/translations';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppStateStore} from '@/src/stores/appStateStore';

jest.mock('expo-localization', () => ({getLocales: jest.fn()}));

const mockedGetLocales = getLocales as jest.Mock;

const Slogan = () => {
  useAppStateWatcher();
  const {t} = useTranslation();
  return <TextLine>{t.common.slogan}</TextLine>;
};

describe('language follows the system while the app runs', () => {
  beforeEach(() => {
    useAppStateStore.setState({language: LANGUAGE.EN, isActive: true});
  });

  it('switches the texts when the app returns to the foreground after a language change', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return {remove: jest.fn()} as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    await render(<Slogan />);
    expect(screen.getByText('Where does my money go?')).toBeTruthy();
    mockedGetLocales.mockReturnValue([{languageCode: 'ru'}]);
    await act(async () => {
      for (const listener of listeners) {
        listener('background');
        listener('active');
      }
    });
    expect(screen.getByText('Куда уходят мои деньги?')).toBeTruthy();
  });
});
