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
- Put the `testID` of anything pressable, or anything with `accessibilityRole` or `accessible`, on a plain wrapper, as the current import card of `HOME` does (`CurrentImportCard.tsx`, its content shortened):

```tsx
return (
  <View testID="home_current_import_row" collapsable={false}>
    <TouchableScaleView
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Card style={styles.card}>{content}</Card>
    </TouchableScaleView>
  </View>
);
```

- Kit components take a `testID` prop and place it on their own wrapper this way (`ui-kit.md`): pass it to them, never to an inner `Pressable`. `MainButton` puts it on the `View` around its pressable (`<MainButton title={t.common.cancel} variant="quiet" onPress={onCancel} testID="import_confirm_cancel_button" />`); so do `TouchableScaleView`, `ScreenHeader` (its back button) and the screen rows `PaymentRow` and `ScenarioRow`.
- Never change a button or its press animation to make an id visible; the wrapper keeps visuals and behaviour untouched.
- Plain `View`s and `TextLine` take `testID` directly; so do `OptionalText` and the amount line of `MonthlyTotal` (both a `TextLine`), and `ScreenLayout`, whose root `SafeAreaView` is a plain native view.

## Naming
- snake_case `<screen>_<element>_<kind>`, where the screen part is the `SCREEN_NAME` member in lower case: `home_add_statement_button`, `import_confirm_send_button`, `import_status_phase_badge`, `import_status_timeline_list`, `import_result_total_text`, `diagnostics_reset_button`.
- Kinds: `_screen`, `_button`, `_link`, `_row`, `_badge`, `_list`, `_text`, `_switch`.
- Every screen root is `<screen>_screen` (`import_status_screen`), passed to `ScreenLayout`; every back button is `<screen>_back_button`, passed to `ScreenHeader`.
- List rows add the server item id: `import_result_payment_row_rec-001`.
- Write ids as literals, or pick them from a literal map (`STATUS_ACTION`, `SCENARIO_TEST_ID`, `COUNTER_TEST_ID`); only a list row appends the server item id. Never build one from a file name, a merchant or an amount: ids are readable in every accessibility dump.

## Accessibility
- Every button and pressable, the `quiet` ones included, gets `accessibilityRole="button"` and an `accessibilityLabel` that says what the press does, by key through `useTranslation()`, in the current language. A press that opens another screen also says where it leads in `accessibilityHint` (the current import card on `HOME`, `PaymentRow`).
- A choice among options gets `accessibilityRole="radio"` with `checked` in its `accessibilityState` instead: the scenario rows on `DIAGNOSTICS` (`ScenarioRow`).
- Disabled and loading states go into `accessibilityState` (`{disabled: true}`, `{busy: true}`).
- Screen titles get `accessibilityRole="header"`.
- A status is never color alone: `StatusBadge` shows an icon and a word, and its label is the word.
- Illustrations and icons next to words are hidden from screen readers; an icon-only button has a label.
- In `ResponseTimeline` a skipped stale answer is marked in words ("Stale, skipped"), so a screen reader hears it too.
- Touch targets follow `TOUCH_TARGET` (44 pt on iOS, 48 dp on Android).
- Every screen stays usable at the largest system font size (`styling-and-theme.md`).

## How To Verify
- Android: `adb shell uiautomator dump` shows every testID as the `resource-id` of its node.
- iOS: `idb ui describe-all --udid <udid>` (start `idb_companion` with `2>/dev/null`, `logging-and-privacy.md`) lists the accessibility elements with their labels. On the iOS 27 simulator it leaves `AXUniqueId` empty for every element, so the wrapper rule is checked in the code and iOS elements are matched by label.
- Match by label (the visible text or `accessibilityLabel`) only when no stable id exists.
