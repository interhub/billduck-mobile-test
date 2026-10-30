---
paths:
  - "src/**/*.tsx"
  - "App.tsx"
  - "src/constants/UI_COLORS.ts"
  - "src/constants/UI_SIZES.ts"
  - "src/constants/UI_MOTION.ts"
  - "src/constants/FONT_NAME.ts"
  - "src/utils/styles/**"
  - "src/hooks/styles/**"
---

# Styling And Theme

## Colors
- Always take colors from `src/constants/UI_COLORS.ts`: through the `colors` argument of the style factory, or `useThemeColors()` for non-style props (icon `color`, `ActivityIndicator`). Never write a color string in a component (`'#fff'`, `'white'`, `rgba(...)`); `'transparent'` is the only allowed literal.
- `UI_COLORS` holds two palettes with the same keys, `light` and `dark`. A missing color is added to both palettes first, never as a local constant.
- `useThemeColors()` (`src/hooks/styles/useThemeColors.ts`) picks the palette from `useColorScheme()`: `'dark'` gives `dark`; `'light'`, `'unspecified'` and `null` give `light`.
- One accent, duck yellow, at most once per screen. Never violet, blue neon, gradients, pure black `#000000` or pure white text on black.
- `app.config.ts` is the only other file that writes hex values (splash and adaptive icon background).
- The values come from the brand (`docs/PROMPT.md`) and live in `src/constants/UI_COLORS.ts`, `UI_SIZES.ts`, `UI_MOTION.ts` and `FONT_NAME.ts`; never a second copy of a value anywhere else.
- Status colors and their icons follow the `StatusBadge` table in `ui-kit.md`; color is never the only sign of a status.
- The status bar follows the theme (`expo-status-bar`), and on Android the system background comes from the palette through `expo-system-ui`, so the dark theme has a dark system background.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FAF8F3` | `#13120F` | Screen background |
| `textPrimary` | `#1A1814` | `#F4F1EA` | Titles, amounts |
| `card` | `#FFFFFF` | `#1C1B17` | Payment cards, sheets |
| `accent` | `#F2C94C` | `#F2C94C` | Primary button, highlight |
| `textOnAccent` | `#1A1814` | `#1A1814` | Text on the yellow button |
| `surfaceSecondary` | `#F3F0E8` | `#24221D` | Secondary buttons, chips |
| `textMuted` | `#6F6A62` | `#A39E94` | Captions, dates |
| `border` | `#E8E4DC` | `#2E2B25` | Thin lines, card borders |
| `accentText` | `#8A6400` | `#F2C94C` | Readable yellow words |
| `beak` | `#E8873A` | `#E8873A` | Duck drawings only |
| `success` | `#1F9D68` | `#3DD68C` | Ready |
| `error` | `#C8323C` | `#FF6B6B` | Error, delete |

- `PAYMENT_DOT_COLORS`, the same in both themes: coral `#E8735A`, sky `#5B8DEF`, mint `#4DBE8F`, sand `#C9A26B`, rose `#E46F9B`. Never add lilac.

## Style Hooks
- Use `StyleSheet.create` for all styles, always wrapped in `getResponsiveStylesHook` (`src/utils/styles/getResponsiveStylesHook.ts`), even when nothing depends on the screen or the theme.
- The factory receives `{dimensions, colors}`; the hook returns `{styles, dimensions, colors}`. `dimensions` holds `width`, `height`, `insets`, `fontScale`, `getVW`, `getVH`.
- Define the style hook after the component. File order: imports, constants, component, style hook.
- Never call `StyleSheet.create` in a component body; never memoize styles with `useMemo` or `useCallback`.
- Use `useWindowDimensions()` directly only for non-style calculations.

```tsx
export const PaymentCard = ({children}: PaymentCardProps) => {
  const {styles} = usePaymentCardStyles();
  return <View style={styles.container}>{children}</View>;
};

const usePaymentCardStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    container: {
      gap: SPACING.sm,
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
  }),
);
```

- Inline styles only for trivial one-off overrides. Merge with arrays: `style={[styles.base, style]}`. Type style props as `StyleProp<ViewStyle>` (or `TextStyle`, `ImageStyle`).
- Write only the styles the layout needs; delete unused ones after a refactor.

## Layout And Tokens
- Flexbox only; build every layout from rows and columns of simple blocks with minimal nesting.
- `gap` between children, `padding` inside a component, `margin` only when neither fits.
- Avoid absolute positioning; when it is unavoidable use `StyleSheet.absoluteFill`.
- `SPACING` (`src/constants/UI_SIZES.ts`): `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32. Screen side padding 16-20.
- `RADIUS`: `button` 10 (buttons and fields), `card` 16, `sheet` 24 (sheets and dialogs).
- `TOUCH_TARGET`: at least 44x44 pt on iOS and 48x48 on Android; grow small visuals with `hitSlop`.
- Borders are `borderWidth: 1` in `border`. No shadows, except one soft warm shadow under a sheet.
- `ICON_SIZE`: `sm` 20, `md` 24. Every size is a named constant, never a number in JSX.

## Typography
- Text renders only through `TextLine`; font sizes and line heights live only in its variants. Screens never set `fontSize`, `fontFamily` or `lineHeight`.
- Families from `FONT_NAME`: Unbounded SemiBold for the logo and one 2-3 word title per screen; Geist Regular and Medium for all other UI; Geist Mono for amounts, dates and file sizes.
- Pick the weight by family (`Geist-Medium`), never by `fontWeight`: Android ignores or fakes it for custom fonts.
- Never fall back to Inter or the system font. Russian text keeps the brand fonts; if one of them lacks Cyrillic, Russian uses the nearest brand font instead.

## Large System Font And Small Screens
- Texts grow with the system font size: never set `allowFontScaling={false}`, never cap `maxFontSizeMultiplier`. The one exception lives in `TextLine`: a text whose word broke in the middle shrinks step by step until the words are whole, never below its size at the default system setting.
- Every screen scrolls (`ScreenLayout`), and its main buttons stay reachable in the pinned footer.
- Let rows wrap (`flexWrap`) instead of truncating amounts or statuses; never give a text container a fixed height.
- `Illustration` halves its size when `fontScale > 1.3` or the window is shorter than 700 pt, and hides when `fontScale > 1.6`.
- Check every screen at the largest accessibility size first, then at the default size, on the smallest phone.

## Safe Area
- Use `SafeAreaView` from `react-native-safe-area-context`; `ScreenLayout` owns it, screens never add a second one.
- The background may run under the notch and the home indicator; texts and buttons stay inside the safe area.
- Never hardcode inset numbers. Leave 12-16 pt between the pinned footer and the bottom safe area edge.

## Motion
- Animate with the built-in `Animated` API and `useNativeDriver: true`: the native driver moves only `opacity` and `transform`, never layout. Create each `Animated.Value` once in a `useState` initializer (`const [opacity] = useState(() => new Animated.Value(1));`): React Compiler forbids reading `ref.current` during render.
- 150-250 ms with `Easing.bezier(0.16, 1, 0.3, 1)` in `Animated.timing`, or `Animated.spring` with stiffness 100 and damping 20 (`MOTION` in `src/constants/UI_MOTION.ts`). The one slow loop is the pulse of an active status dot: a 1200 ms cycle on a sine curve (`MOTION.pulseCycleMs`, `MOTION.pulseEasing`).
- A status change cross-fades; it never jumps.
- Reduce Motion comes from `useReduceMotion()` (`src/hooks/sensors/useReduceMotion.ts`), built on `AccessibilityInfo.isReduceMotionEnabled()` and the `reduceMotionChanged` event. While it is on, skip every animation and show the end state: no pulse, no press scale, no cross-fade.

## Modals
- Every `<Modal>`, including sheets and overlays built on it, passes `supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}` from `src/constants/MODAL_SUPPORTED_ORIENTATIONS.ts` (portrait, matching the app).
- Never hand-write an orientation array at the call site: a modal whose orientations miss the app's crashes a release build and only logs a warning in development.
