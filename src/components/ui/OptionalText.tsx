import {StyleProp, TextStyle} from 'react-native';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {TextLine, TextLineVariant} from '@/src/components/ui/TextLine';

type OptionalTextProps = {
  /** Nothing renders without a text. */
  text: string | null;
  /** Hides a text that is always known, such as a fixed hint; shown by default. */
  isVisible?: boolean;
  variant?: TextLineVariant;
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/** A line of text that only some states have: a caption, a hint, a detail. */
export const OptionalText = ({
  text,
  isVisible = true,
  variant,
  color,
  align,
  style,
  testID
}: OptionalTextProps) => {
  if (!isVisible || !text) {
    return null;
  }
  return (
    <TextLine variant={variant} color={color} align={align} style={style} testID={testID}>
      {text}
    </TextLine>
  );
};
