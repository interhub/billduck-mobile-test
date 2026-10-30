import {fireEvent, render, screen} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';

const mockWindow = {width: 390, height: 844, scale: 3, fontScale: 3};

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow
}));

const DISPLAY_FONT_SIZE = 26;

const fontSizeOf = (text: ReturnType<typeof screen.getByText>): number =>
  StyleSheet.flatten(text.props.style).fontSize;

const layoutLines = async (text: ReturnType<typeof screen.getByText>, lines: string[]) => {
  await fireEvent(text, 'textLayout', {
    nativeEvent: {lines: lines.map((line) => ({text: line}))}
  });
};

describe('TextLine keeps words whole at large system font sizes', () => {
  beforeEach(() => {
    mockWindow.fontScale = 3;
  });

  it('shrinks a title whose word broke in the middle, and stops once the words are whole', async () => {
    await render(<TextLine variant="display">Диагностика</TextLine>);
    await layoutLines(screen.getByText('Диагностика'), ['Диагности', 'ка']);
    const shrunk = fontSizeOf(screen.getByText('Диагностика'));
    expect(shrunk).toBeLessThan(DISPLAY_FONT_SIZE);
    await layoutLines(screen.getByText('Диагностика'), ['Диагностика']);
    expect(fontSizeOf(screen.getByText('Диагностика'))).toBe(shrunk);
  });

  it('leaves lines that end between words alone', async () => {
    await render(<TextLine variant="display">Каждый месяц</TextLine>);
    await layoutLines(screen.getByText('Каждый месяц'), ['Каждый ', 'месяц']);
    expect(fontSizeOf(screen.getByText('Каждый месяц'))).toBe(DISPLAY_FONT_SIZE);
  });

  it('never goes below the size the text has at the standard system setting', async () => {
    await render(<TextLine variant="display">Обрабатывается</TextLine>);
    const brokenLayouts = Array.from({length: 30}, () => ['Обрабатыва', 'ется']);
    for (const lines of brokenLayouts) {
      await layoutLines(screen.getByText('Обрабатывается'), lines);
    }
    const renderedSize = fontSizeOf(screen.getByText('Обрабатывается')) * mockWindow.fontScale;
    expect(renderedSize).toBeCloseTo(DISPLAY_FONT_SIZE);
  });

  it('does not watch the layout at the standard system size', async () => {
    mockWindow.fontScale = 1;
    await render(<TextLine variant="display">Диагностика</TextLine>);
    expect(screen.getByText('Диагностика').props.onTextLayout).toBeUndefined();
  });
});
