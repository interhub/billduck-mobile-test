---
paths:
  - "src/components/**"
  - "src/screens/**"
---

# UI Kit

## Goals
- Prefer the kit over new components; reuse before creating.
- The kit lives flat in `src/components/ui/`, one exported component per file, no barrel: `import {MainButton} from '@/src/components/ui/MainButton';`. A small private part that only that component uses may stay in its file (`PulseDot` in `StatusBadge.tsx`).
- Every kit component takes its colors from the theme (`styling-and-theme.md`) and accepts `style` and `testID`. `style` (`StyleProp<ViewStyle>`, `StyleProp<TextStyle>` for `TextLine` and `OptionalText`) goes after the component's own style: `style={[styles.card, style]}`.
- `testID` goes where a test can read it (`testid-and-accessibility.md`): on a plain wrapper `<View collapsable={false}>` around anything pressable or accessible (`MainButton`, `TouchableScaleView`, the back button of `ScreenHeader`, `StatusBadge`, `InfoRow`), on the root view of `Card`, `ResponseTimeline` and `Illustration`, on the root `SafeAreaView` of `ScreenLayout`, and on the text itself in `TextLine`, `OptionalText` and the amount line of `MonthlyTotal`.
- Every interface word a kit component shows comes by key through `useTranslation()`, or arrives in a prop that already came that way; server data (merchants, amounts, dates) arrive as props and are formatted through `src/utils/format/`.

## TextLine
- Use for every text; screens never render `Text` from `react-native` (ESLint).
- Variants: `display` (Unbounded SemiBold: the logo and one 2-3 word title per screen), `title` (Geist Medium), `label` (Geist Medium, smaller: row titles and section names), `body` (Geist Regular), `caption` (Geist Regular in `textMuted`), `money` (Geist Mono: amounts, dates, times, file sizes, revisions), `moneyLarge` (Geist Mono, large: the monthly total).
- Key props: `variant`, `color` (a palette key such as `'textMuted'`, never a hex), `align`, `numberOfLines`, `accessibilityRole` (`'header'` for screen titles), `accessibilityLabel`, `style`, `testID`.

## MainButton
- Use for every screen action: "Add statement", "Send", "Cancel", "Choose another file", "Retry", "Send again", "Cancel upload", "Open report", "Choose the file again", "Back to the main screen", "Server answers", "Delete import", "Refresh", "Reset all", and the "Diagnostics" link.
- Variants: `primary` (`accent` with `textOnAccent`), `secondary` (`surfaceSecondary`), `destructive` (`error` text on the card background with a thin border: "Delete import", "Reset all"), `quiet` (text only, no fill, `textMuted`: "Cancel upload", "Cancel", the "Diagnostics" link).
- At most one `primary` per screen: its yellow fill is the one accent of the screen.
- Key props: `title`, `onPress`, `variant`, `loading`, `disabled`, `accessibilityLabel` (defaults to `title`), `style`, `testID`.
- `loading` shows a spinner and blocks presses with `accessibilityState={{disabled: true, busy: true}}`; `disabled` blocks presses, dims the button (`DISABLED_OPACITY`) and sets `{disabled: true}`. Every variant, `quiet` included, is at least `TOUCH_TARGET` high.

## ScreenLayout
- The root of every screen: `SafeAreaView`, theme background, scrollable content, pull to refresh, and a pinned footer for the main buttons.
- Key props: `header`, `children` (the scroll content), `footer`, `onRefresh` (pull to refresh through `RefreshControl`, for `IMPORT_STATUS`, `IMPORT_RESULT` and `DIAGNOSTICS`), `refreshing`, `style`, `testID` (required, `<screen>_screen`).
- Screens never add their own `SafeAreaView`, root `ScrollView`, `RefreshControl`, background or footer container; they style only their content.

## StatusBadge
- Shows the phase of the operation as icon + word + color, never color alone. The colors are the brand status colors.
- Key props: `phase` (`BadgePhase` from `src/utils/import/importPhases.ts`: every `ImportPhase` but the pre-send ones), `style`, `testID`.

| Phase | Word | Look |
|---|---|---|
| `uploading` | Sending | Yellow dot with a soft pulse, static under Reduce Motion |
| `queued` | Queued | Empty circle in `textMuted` |
| `processing` | Processing | Yellow dot with a soft pulse, static under Reduce Motion |
| `ready` | Ready | `success` |
| `reconnecting` | Reconnecting… | `accentText`: not an error yet |
| `not_received` | Not received | `accentText`: the file is still safe on the phone |
| `server_unavailable` | Server unavailable | `error` |
| `failed` | Error | `error` |
| `replacing_previous` | Replacing | `textMuted` |
| `deleting` | Deleting | `textMuted` |
| `delete_failed` | Not deleted | `error` |
| `deleted` | Deleted | `textMuted` with a check icon |
| `gone_on_server` | Not on the server | `textMuted`, never the check icon of `deleted` |

- The pre-send phases (`validating`, `rejected`, `confirming`) have no badge.
- Words come by key (`t.phase`) in both languages. A new phase gets its look in `BADGE_LOOK` and in this table before any screen shows it.

## ResponseTimeline
- The feed of server answers under the status on `IMPORT_STATUS`, and the event journal on `DIAGNOSTICS`.
- One row per event: the event in words (`label`), then its time, status, revision, HTTP status, attempt and repeat count (`money`). A skipped stale answer stays in the feed and is marked "Stale, skipped" in words, not by color alone. Lost answers and dropped connections are rows too ("Answer to the upload lost", then "Upload found by key"); an answer equal to the previous row folds into it with a repeat count.
- Each row has a dot in the color of its tone (`neutral`, `positive`, `warning`, `negative`), never the only sign.
- Key props: `entries` (the timeline or the journal from `importStore`, kept in memory only), `emptyText` (required, the caption while there are no rows), `style`, `testID` (`import_status_timeline_list`, `diagnostics_journal_list`).
- Shows no file names, merchants or amounts (`logging-and-privacy.md`).

## MonthlyTotal
- The monthly total of the repeating payments in figures (`formatMonthlyTotal`), with the count of payments under it ("2 repeating payments"): on `IMPORT_RESULT`, on the ready card of `HOME` and on the ready status.
- Key props: `payments` (`StatementPayments`), `variant` (`'moneyLarge'` on the report, `'money'` where the total sums the report up), `style`, `testID` (on the amount line, the value a test reads: `import_result_total_text`).

## OptionalText
- A `TextLine` that renders only when it has a text and `isVisible` is not `false`: a caption, a hint or a detail that only some states have. Its text has already come by key.
- Key props: `text` (`string | null`), `isVisible` (`true` by default), `variant`, `color`, `align`, `style`, `testID`.

## Illustration
- The only way to show a `bd_*` picture, through `expo-image`. It picks the `-dark` file in the dark theme, caps the width at 280 pt, halves the size when `fontScale > 1.3` or the window is shorter than 700 pt, and renders nothing when `fontScale > 1.6`.
- Key props: `name` (`'empty'`, `'checking'`, `'rejected'`, `'waiting'`, `'ready'`, `'unknown'`, `'error'`, `'deleting'`, `'deleted'`; where each one goes is in `icons-and-images.md`), `style`, `testID`.
- Decorative: hidden from screen readers. At most one per screen.

## TouchableScaleView
- A `Pressable` that scales slightly on press through `Animated` with the native driver, for any custom tappable area (rows, cards); `MainButton`, the back button of `ScreenHeader`, `PaymentRow`, `ScenarioRow` and the current import card of `HOME` are built on it. No scale under Reduce Motion.
- Key props: the `PressableProps` (its own `style`, `children` and `testID` replace theirs), `style` (on the scaled content), `children`, `testID` (on a plain wrapper `View`, added only when given). Always pass `accessibilityRole` and `accessibilityLabel`.

## Also In The Folder
- `ScreenHeader`: the pinned top row of a pushed screen with the back action ("Back"); screens pass it to `ScreenLayout` as `header`. Key props: `onBack`, `style`, `testID` (required, the id of the back button: `<screen>_back_button`).
- `Card`: a block with a thin border on the card background, for details, totals and payments; never nested. Key props: `children`, `style`, `testID`.
- `InfoRow`: a label over its value, read by a screen reader as one element ("label: value"); the value wraps instead of being cut at a large font size. Key props: `label`, `value`, `valueVariant` (`body` by default, `money` for sizes, amounts, dates and ids), `style`, `testID`.

## Parts Of One Screen
- They live in their screen folder and move to the kit on the second consumer (`project-structure-and-reuse.md`).
- `PaymentRow` (`src/screens/Import/components/PaymentRow.tsx`, used by `PaymentList` on `IMPORT_RESULT`): one recurring payment with its color dot, merchant, cadence, last charge, amount (`money`) and "Details", which opens `PAYMENT_DETAILS`. Key props: `payment` (`RecurringItem`), `currency`, `position` (the place in the list, which picks the dot from `PAYMENT_DOT_COLORS`), `onPress` (gets the payment id), `testID` (`import_result_payment_row_<payment.id>`). Its `accessibilityLabel` reads merchant, amount and cadence in words.
- `BillDuckLogo` (`src/screens/Home/components/BillDuckLogo.tsx`, used by `HomeHeader`): the logo as `react-native-svg` code (`icons-and-images.md`). Key prop: `testID` (`home_logo_text`).

## Creating New Components
- Create one only when a pattern repeats across screens. A component for one screen lives in `src/screens/<Feature>/components/` and moves to `src/components/ui/` on the second consumer.
- Search first: `ls src/components/ui src/screens/*/components`.
- PascalCase name and file, named export, theme colors, `style` and `testID` props, styles in a `getResponsiveStylesHook` after the component.
