---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# React Native Code Style

## Anti-Patterns (read first)

Before writing or refactoring any code, check it against this list. Violating these rules is not acceptable.

### General
- Never build large monolithic components; split them into files.
- Never write inline styles; use `StyleSheet.create` inside `getResponsiveStylesHook` (`styling-and-theme.md`).
- Never create styles inside a component body, with or without `useMemo`/`useCallback`.
- Never ignore or silence TypeScript errors (`@ts-ignore`, `@ts-expect-error`, `as any`); fix them. `strict: true` stays on.
- Never drill props through many levels; use composition or a focused Zustand store.
- Never mix business logic with presentation: import logic lives in `src/utils/import/` and `src/services/importController/`, never in screens.
- Never use magic numbers; use named constants (`LIMITS`, `UI_SIZES`, `UI_MOTION`).
- Never create components or render functions inside components.
- Never swallow an error silently; log it through `logger` and handle the case explicitly.

### JSX
- Keep JSX tags clean: no logic inside props (`onPress={() => {validate(); send();}}`, `value.trim().slice(0, 4)`). Move it to the component body or a hook.
- Compute conditional elements in the component body as named variables; never put ternaries or `&&` chains inside JSX.

### TypeScript
- Never use default exports; use `export const`. The only default exports are the ones a tool requires: `app.config.ts`, and `App.tsx` when it is loaded by `expo/AppEntry`.
- Never call hooks conditionally (`const value = isReady ? useThing() : null`).
- Never use `unknown`, except for a caught failure (`catch (error)`, `src/utils/errors/**`) and for parsed JSON inside a typed guard (server responses in `src/api/`, the stored operation in the repository); narrow it before reading anything.
- Never use `any`.
- Never reassign `let`; use `const`.
- Never write classes with static methods; write plain functions.

### Code patterns
- Avoid ternary operators; prefer a small function with early `if` returns. Never nest them.
- Never use imports or requires built from strings (`` require(`./${name}.png`) ``); use static imports and static `require` maps.
- Never use short names (`i`, `e`, `res`, `item`, `cur`); use informative ones (`pollAttempt`, `uploadResult`, `paymentItem`).
- Never write helpers like `callWith(callback)` that only call what they receive.
- Never write a wrapper function only to add logging; log inside the function that does the work.
- Never call `console.*` outside `src/utils/logger/`; use `logger` (`logging-and-privacy.md`).

## Platform
- The app is React Native for iOS and Android phones only: no web, no tablets.
- Use React Native core components and the libraries already in `package.json`; never use DOM APIs.
- Branch platforms with `Platform.OS` or `Platform.select`; use `*.ios.tsx` / `*.android.tsx` siblings only when the whole file differs.

## Code Style
- Write small, focused functions and components; prefer early returns over deep nesting.
- Never mutate input parameters or objects read from a store.
- Keep diffs minimal and local; no unrelated refactors.
- Follow DRY, KISS and YAGNI.
- Formatting: single quotes, semicolons, the repo Prettier settings.
- Prefer `for...of` over index loops.
- Do not add blank lines between consecutive calls and statements.
- Comments in English, only on complex or critical code.

## Naming
- PascalCase: components, types, enums. camelCase: functions, variables, hooks.
- UPPER_SNAKE_CASE: constants and enum members (`SCREEN_NAME.HOME`, `ERROR_KIND.NETWORK`). Exception: `LOG_NAME` and `LOG_TYPE` members equal their snake_case values (`LOG_NAME.error_log`).
- Files: PascalCase for components (`MainButton.tsx`), camelCase for hooks and modules (`useThemeColors.ts`, `importsApi.ts`), UPPER_SNAKE_CASE for constant registries (`UI_COLORS.ts`).
- Spell names out: `currentRevision`, not `rev`; `paymentItem`, not `item`.

## Architecture
- State: Zustand stores in `src/stores/` (`importStore`, `appStateStore`), see `custom-hooks.md`.
- Navigation: React Navigation 7, one native stack, see `navigation.md`.
- UI copy: every user-facing string lives in `src/i18n/translationsEn.ts` and `src/i18n/translationsRu.ts` with the same keys, and components read it only by key through `useTranslation()` (`const {t} = useTranslation();`, then `t.importStatus.sendAgain`); never inline user-facing text.
- Language: Russian when the first system language is Russian (`expo-localization`), otherwise English; the name `BillDuck` is the same in both. The language is read again when the app returns to the foreground (`custom-hooks.md`).
- Animations: the built-in `Animated` API with `useNativeDriver: true`, and the end state without animation under Reduce Motion (`styling-and-theme.md`).
- Import flow: `network-and-import-policy.md`. File placement: `project-structure-and-reuse.md`.

## Error Handling
- Never throw across module boundaries. Network and file functions return a result object:

```ts
type ApiResult<T> =
  | {success: true; payload: T}
  | {success: false; error: {kind: ERROR_KIND; httpStatus: number | null}};
```

- Catch at the boundary (`src/api/`, `src/utils/files/`) and convert to a result; callers branch on `success`.
- Handle every failure explicitly and give it a UI state; never show a raw error message to the user.
- Validate inputs at boundaries: server responses through typed guards, picked files through `src/utils/files/`.

## Money And Dates
- Keep money in integer minor units (`amountMinor`); sum integers and convert to major units only when formatting.
- Format money, dates and file sizes only through `src/utils/format/`, by the current language: `151.99 AUD / month` in English, `151,99 AUD в месяц` in Russian.
- Server dates such as `2026-10-01` (`lastSeen`) are calendar dates: format them without a time zone shift. Never pass them to `new Date()` for display: it parses them as UTC midnight and shows the previous day west of UTC.

## Performance
- React Compiler is on (`experiments.reactCompiler: true`): never add `useCallback`, `useMemo` or `React.memo` only for performance.
- Keep manual memoization only where identity is load-bearing: a `useEffect` dependency that restarts work, the `useFocusEffect` callback, `FlatList` `renderItem`/`keyExtractor`/`data`, a custom `React.memo` comparator, a debounced function that must keep one identity, a genuinely expensive computation.
- `React.memo` never hits when the parent passes fresh JSX children, inline arrows, inline objects or inline style arrays.
- `"use no memo"` at the top of a file turns the compiler off for that file only.
- Give list items stable keys (server ids such as `rec-001`); use `FlatList` for long lists.
- Clean up every timer, listener and subscription.

## React Native 0.86 Traps
- Never use `response.blob()` or `new Blob([arrayBuffer])`: both throw at once on RN 0.86.
- Use `StyleSheet.absoluteFill`; `absoluteFillObject` is removed.
- `ColorSchemeName` has a new value, `'unspecified'`: treat it as the light theme (`useThemeColors()`).
- Type timers as `ReturnType<typeof setTimeout>`; use `globalThis`, never `global`.
