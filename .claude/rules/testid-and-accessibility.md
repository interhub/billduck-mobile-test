---
paths:
  - "src/**/*.tsx"
  - "App.tsx"
---

# testID And Accessibility

## Why testID Goes On A Wrapper
- On iOS `testID` becomes the native `accessibilityIdentifier`. An element that is a single accessibility element (`accessible={true}`, which a `Pressable` gets once it has `accessibilityRole="button"`) exposes only its label and traits: its identifier never reaches XCUITest, Maestro or `idb`.
- A plain `View` is not an accessibility element, so its identifier stays visible. `collapsable={false}` stops the New Architecture from flattening a style-less wrapper and losing the identifier.

## The Rule
- Put the `testID` of anything pressable, or anything with `accessibilityRole` or `accessible`, on a plain wrapper:

```tsx
const {t} = useTranslation();

<View testID="import_status_send_again_button" collapsable={false}>
  <MainButton title={t.importStatus.sendAgain} onPress={sendAgain} />
</View>
```

- Kit components (`MainButton`, `PaymentRow`, rows built on `TouchableScaleView`) take a `testID` prop and place it on their own wrapper this way: pass it to them, never to an inner `Pressable`.
- Never change a button or its press animation to make an id visible; the wrapper keeps visuals and behaviour untouched.
- Plain `View`s and `TextLine` take `testID` directly.

## Naming
- snake_case `<screen>_<element>_<kind>`, where the screen part is the `SCREEN_NAME` member in lower case: `home_add_statement_button`, `import_confirm_send_button`, `import_status_phase_badge`, `import_status_timeline_list`, `import_result_total_text`, `diagnostics_reset_button`.
- Kinds: `_screen`, `_button`, `_link`, `_row`, `_badge`, `_list`, `_text`, `_switch`.
- Every screen root is `<screen>_screen` (`import_status_screen`), passed to `ScreenLayout`.
- List rows add the server item id: `import_result_payment_row_rec-001`.
- Write ids as literals. Never build one from a file name, a merchant or an amount: ids are readable in every accessibility dump.

## Accessibility
- Every button and pressable, the `quiet` ones included, gets `accessibilityRole="button"` and an `accessibilityLabel` that says what the press does, by key from `src/i18n/translations.ts` through `useTranslation()`, in the current language.
- Disabled and loading states go into `accessibilityState` (`{disabled: true}`, `{busy: true}`).
- Screen titles get `accessibilityRole="header"`.
- A status is never color alone: `StatusBadge` shows an icon and a word, and its label is the word.
- Illustrations and icons next to words are hidden from screen readers; an icon-only button has a label.
- In `ResponseTimeline` a skipped stale answer is marked in words ("stale, skipped"), so a screen reader hears it too.
- Touch targets follow `TOUCH_TARGET` (44 pt on iOS, 48 dp on Android).
- Every screen stays usable at the largest system font size (`styling-and-theme.md`).

## How To Verify
- iOS: on a simulator run `idb ui describe-all --udid <udid>` (start `idb_companion` with `2>/dev/null`, `logging-and-privacy.md`); the element must show an `AXUniqueId` equal to its testID. An empty id next to a filled `AXLabel` means the testID sits on an accessibility element: move it to a wrapper.
- Match by label (the visible text or `accessibilityLabel`) only when no stable id exists.
