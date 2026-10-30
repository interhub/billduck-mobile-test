---
paths:
  - "src/components/**"
  - "src/screens/**"
---

# UI Kit

## Goals
- Prefer the kit over new components; reuse before creating.
- The kit lives flat in `src/components/ui/`, one component per file, no barrel: `import {MainButton} from '@/src/components/ui/MainButton';`.
- Every kit component takes its colors from the theme (`styling-and-theme.md`), accepts `style` (`StyleProp<ViewStyle>`) and `testID`, and puts `testID` on its own wrapper `<View collapsable={false}>` (`testid-and-accessibility.md`).
- Every interface word a kit component shows comes by key through `useTranslation()` from `src/i18n/translations.ts`, or arrives in a prop that already came from there; server data (merchants, amounts, dates) arrive as props and are formatted through `src/utils/format/`.

## TextLine
- Use for every text; screens never render `Text` from `react-native`.
- Variants: `display` (Unbounded SemiBold: the logo and one 2-3 word title per screen), `title` (Geist Medium), `label` (Geist Medium, smaller: row titles and section names), `body` (Geist Regular), `caption` (Geist Regular in `textMuted`), `money` (Geist Mono: amounts, dates, times, file sizes, revisions), `moneyLarge` (Geist Mono, large: the monthly total).
- Key props: `variant`, `color` (a palette key such as `'textMuted'`, never a hex), `align`, `numberOfLines`, `accessibilityRole` (`'header'` for screen titles).

## MainButton
- Use for every screen action: "Add statement", "Send", "Cancel", "Retry", "Send again", "Cancel upload", "Details", "Delete import", "Reset all".
- Variants: `primary` (`accent` with `textOnAccent`), `secondary` (`surfaceSecondary`), `destructive` (`error`, for deleting), `quiet` (text only, no fill, `textMuted`: the quiet "Cancel upload" in `server_unavailable` and `not_received`, the quiet "Cancel" while `queued` or `processing`).
- At most one `primary` per screen: the yellow accent appears once.
- Key props: `title`, `onPress`, `variant`, `loading`, `disabled`, `accessibilityLabel` (defaults to `title`), `testID`.
- `loading` blocks presses and sets `accessibilityState={{busy: true}}`; `disabled` sets `accessibilityState={{disabled: true}}`. Every variant, `quiet` included, is at least `TOUCH_TARGET` high.

## ScreenLayout
- The root of every screen: `SafeAreaView`, theme background, scrollable content, pull to refresh, and a pinned footer for the main buttons.
- Key props: `header`, `children` (the scroll content), `footer`, `onRefresh` (pull to refresh through `RefreshControl`, for `IMPORT_STATUS` and `IMPORT_RESULT`), `refreshing`, `testID` (`<screen>_screen`).
- Screens never add their own `SafeAreaView`, root `ScrollView`, `RefreshControl`, background or footer container; they style only their content.

## StatusBadge
- Shows the phase of the operation as icon + word + color, never color alone. The colors are the brand status colors.
- Key props: `phase` (`ImportPhase`).

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
- Words come by key from `src/i18n/translations.ts` in both languages. A new phase gets its look here before any screen shows it.

## ResponseTimeline
- The feed of server answers under the status on `IMPORT_STATUS`, and the event journal on `DIAGNOSTICS`.
- One row per event: status, revision and time (`money` variant). A skipped stale answer stays in the feed and is marked "stale, skipped" in words, not by color alone. Repeats, lost answers and dropped connections are rows too ("answer to the upload lost", then "upload found by key").
- Key props: `entries` (the timeline from `importStore`, kept in memory only), `testID` (`import_status_timeline_list`).
- Shows no file names, merchants or amounts (`logging-and-privacy.md`).

## PaymentRow
- One recurring payment in the result list: color dot, merchant, amount (`money`) and cadence, with a "Details" action that opens `PAYMENT_DETAILS`.
- Key props: `item` (`RecurringItem`), `currency`, `dotColor` (from `PAYMENT_DOT_COLORS` by list index), `onPress`, `testID` (`import_result_payment_row_<item.id>`).
- Its `accessibilityLabel` reads merchant, amount and cadence in words.

## Illustration
- The only way to show a `bd_*` picture, through `expo-image`. It picks the `-dark` file in the dark theme, caps the width at 280 pt, halves the size when `fontScale > 1.3` or the window is shorter than 700 pt, and renders nothing when `fontScale > 1.6`.
- Key props: `name` (`'empty'`, `'checking'`, `'rejected'`, `'waiting'`, `'ready'`, `'unknown'`, `'error'`, `'deleting'`, `'deleted'`; where each one goes is in `icons-and-images.md`).
- Decorative: hidden from screen readers. At most one per screen.

## TouchableScaleView
- A `Pressable` that scales slightly on press through `Animated` with the native driver, for any custom tappable area (rows, cards); `MainButton` and `PaymentRow` are built on it. No scale under Reduce Motion.
- Key props: all `PressableProps`, `style`, `children`. Always pass `accessibilityRole` and `accessibilityLabel`.

## Also In The Folder
- `BillDuckLogo`: the logo as a `react-native-svg` component (`icons-and-images.md`).
- `ScreenHeader`: the pinned top row of a pushed screen with the back action; screens pass it to `ScreenLayout` as `header`.
- `Card`: a block with a thin border on the card background, for details, totals and payments; never nested.
- `InfoRow`: a label over its value; the value wraps instead of being cut at a large font size (`money` for sizes, amounts, dates and ids).

## Creating New Components
- Create one only when a pattern repeats across screens. A component for one screen lives in `src/screens/<Feature>/components/` and moves to `src/components/ui/` on the second consumer.
- Search first: `ls src/components/ui src/screens/*/components`.
- PascalCase name and file, named export, theme colors, `style` and `testID` props, styles in a `getResponsiveStylesHook` after the component.
