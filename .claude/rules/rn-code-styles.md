---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# React Native Code Style

## Anti-Patterns (read first)

Before writing or refactoring any code, check it against this list. Violating these rules is not acceptable. A rule marked ESLint fails `npm run lint` when it is broken (Machine Checks below).

### General
- Never build large monolithic components; split them into files. One exported component per file, in the kit and in screen folders alike; a small private part that only this component uses may stay in its file (`ButtonSpinner` in `MainButton.tsx`).
- Never write a style object in JSX, alone or inside a style array (`style={{opacity}}`, `style={[styles.dot, {opacity}]}`); use `StyleSheet.create` inside `getResponsiveStylesHook` (`styling-and-theme.md`). ESLint rejects both forms, and a `StyleSheet.create` outside `getResponsiveStylesHook` in a `.tsx` file.
- The one exception is a value a style sheet cannot hold: an animated value, or the word-fit size of `TextLine`. Name it in the component body and pass the name: `const fadeStyle = {opacity};`, then `style={[styles.dot, fadeStyle]}`.
- Never create any other style inside a component body, with or without `useMemo`/`useCallback`.
- Never ignore or silence TypeScript errors (`@ts-ignore`, `@ts-expect-error`, `as any`); fix them. `strict: true` stays on. ESLint runs `ban-ts-comment` and `no-explicit-any`.
- Never drill props through many levels; use composition or a focused Zustand store.
- Never mix business logic with presentation: import logic lives in `src/utils/import/` and `src/services/importController/`, never in screens.
- Never use magic numbers. A value other files read lives in a registry (`LIMITS`, `UI_SIZES`, `UI_MOTION`); a value one file reads is a named constant at its top (`TEXTS_MIN_WIDTH` in `PaymentRow.tsx`). Half a size for a circle radius (`STATUS_DOT_SIZE / 2`) is geometry, not a magic number.
- Never create components or render functions inside components (ESLint `react-hooks/static-components` rejects a component made during render).
- Never swallow an error silently; log it through `logger` and handle the case explicitly.

### JSX
- Keep JSX tags clean: no logic inside props (`onPress={() => {validate(); send();}}`, `value.trim().slice(0, 4)`). Move it to the component body or a hook. ESLint rejects a call as a prop value.
- Compute conditional elements in the component body as named variables; never put ternaries or `&&` chains inside JSX. ESLint rejects a ternary and a `&&`, `||` or `??` inside JSX.

### TypeScript
- Never use default exports; use `export const`. The only default export is the one Expo requires, `app.config.ts`. ESLint `import/no-default-export` is off for that file alone. Config plugins in `plugins/` are CommonJS files with `module.exports`, as Expo loads them.
- Never call hooks conditionally (`const value = isReady ? useThing() : null`); ESLint `react-hooks/rules-of-hooks`.
- Never write `unknown`, except for a caught failure (`src/utils/errors/`) and for parsed JSON inside a typed guard (`src/utils/json/`, server responses in `src/api/`, the stored operation in `operationRepository.ts`); narrow it before reading anything. ESLint rejects the keyword everywhere else; `catch (error)` needs no keyword.
- Never use `any` (ESLint).
- Never declare `let` or `var`; use `const` (ESLint).
- Never write classes; write plain functions (ESLint).

### Code patterns
- Never write a ternary operator; write a small function with early `if` returns (ESLint `no-ternary`).
- Never use imports or requires built from strings (`` require(`./${name}.png`) ``); use static imports and static `require` maps.
- Never use short names; use informative ones (`attempt`, `uploadAnswer`, `paymentItem`). ESLint `id-denylist` rejects `i`, `j`, `k`, `e`, `err`, `res`, `req`, `item`, `cur`, `val`, `tmp` and `obj`. The logger methods `d`, `w` and `e` are the one exception (`logging-and-privacy.md`).
- `t` is only the strings that `useTranslation()` returns (`const {t} = useTranslation();`). A function parameter that takes the strings is named `translations`, and a component calls `useTranslation()` itself instead of taking `t` as a prop.
- A duration is `durationMs` or `delayMs`, never `ms`.
- Never write helpers like `callWith(callback)` that only call what they receive.
- Never write a wrapper function only to add logging; log inside the function that does the work.
- Never call `console.*` outside `src/utils/logger/`; use `logger` (`logging-and-privacy.md`). ESLint `no-console`.

## Platform
- The app is React Native for iOS and Android phones only: no web, no tablets.
- Use React Native core components and the libraries already in `package.json`; never use DOM APIs.
- Branch platforms with `Platform.OS` or `Platform.select`; use `*.ios.tsx` / `*.android.tsx` siblings only when the whole file differs.

## Code Style
- Write small, focused functions and components; prefer early returns over deep nesting.
- Size: every code file, tests included, stays at 300 lines or fewer (ESLint `max-lines`). Every production function and component stays at 60 lines or fewer, blank lines and comments not counted (ESLint `max-lines-per-function` for `src/`, `App.tsx`, `index.ts`, `app.config.ts` and `plugins/`; test files are exempt from it).
- Never mutate input parameters or objects read from a store (ESLint `no-param-reassign` with `props: true`). Config plugins are the one exception: the plugin API hands them the config to edit (`expo-config-and-native.md`).
- Keep diffs minimal and local; no unrelated refactors.
- Follow DRY, KISS and YAGNI.
- Formatting: `.prettierrc.json` (single quotes, semicolons, no bracket spacing, no trailing commas, parentheses around every arrow parameter, 100 columns); `npm run lint` checks it.
- Prefer `for...of` over index loops.
- Do not add blank lines between consecutive calls and statements.
- Comments in English, only on complex or critical code.

## Naming
- PascalCase: components and types. camelCase: functions, variables, hooks.
- UPPER_SNAKE_CASE: enums and their members, constants and registries (`SCREEN_NAME.HOME`, `ERROR_KIND.NETWORK`, `LIMITS.MAX_FILE_SIZE_BYTES`). The keys of a UI token scale stay short camelCase (`SPACING.sm`, `RADIUS.card`, `MOTION.durationFast`). `LOG_NAME` and `LOG_TYPE` members equal their snake_case values (`LOG_NAME.error_log`).
- Files: PascalCase for components (`MainButton.tsx`), camelCase for hooks and modules (`useThemeColors.ts`, `importsApi.ts`), UPPER_SNAKE_CASE for constant registries (`UI_COLORS.ts`).
- Spell names out: `operationId`, not `opId`; `payment`, not `item`.

## Architecture
- State: Zustand stores in `src/stores/` (`importStore`, `appStateStore`), see `custom-hooks.md`.
- Navigation: React Navigation 7, one native stack, see `navigation.md`.
- UI copy: every user-facing string lives in `src/i18n/translationsEn.ts` and `src/i18n/translationsRu.ts` with the same keys (the Russian object is typed as the English `Translation`, so a missing or extra key fails the typecheck), and components read it only by key through `useTranslation()` (`const {t} = useTranslation();`, then `t.importStatus.sendAgain`); never inline user-facing text.
- Language: Russian when the first system language is Russian (`expo-localization`), otherwise English; the name `BillDuck` is the same in both. The language is read again when the app returns to the foreground (`custom-hooks.md`).
- Animations: the built-in `Animated` API with `useNativeDriver: true`, and the end state without animation under Reduce Motion (`styling-and-theme.md`).
- Import flow: `network-and-import-policy.md`. File placement: `project-structure-and-reuse.md`.

## Error Handling
- Never throw across module boundaries. Network and file functions return a result object (`src/types/importApi.ts`); build a failure with `failure(kind, httpStatus)` or `failureForStatus(status)` from `src/api/apiResult.ts`:

```ts
type ApiResult<T> =
  | {success: true; payload: T}
  | {success: false; error: {kind: ERROR_KIND; httpStatus: number | null}};
```

- Catch at the boundary (`src/api/`, `src/utils/files/`, the operation repository) and convert to a result; callers branch on `success`.
- Handle every failure explicitly and give it a UI state; never show a raw error message to the user.
- Validate inputs at boundaries: server responses through typed guards, picked files through `src/utils/files/`.

## Money And Dates
- Keep money in integer minor units (`amountMinor`); sum integers and convert to major units only when formatting.
- Format money, dates and file sizes only through `src/utils/format/`, by the current language: `151.99 AUD / month` in English, `151,99 AUD в месяц` in Russian.
- Server dates such as `2026-10-01` (`lastSeen`) are calendar dates: format them without a time zone shift. Never pass them to `new Date()` for display: it parses them as UTC midnight and shows the previous day west of UTC.

## Performance
- React Compiler is on (`experiments.reactCompiler: true`): never add `useCallback`, `useMemo` or `React.memo` only for performance.
- Keep manual memoization only where identity is load-bearing: a `useEffect` dependency that restarts work, the `useFocusEffect` callback, `FlatList` `renderItem`/`keyExtractor`/`data`, a custom `React.memo` comparator, a debounced function that must keep one identity, a genuinely expensive computation, and the style sheet inside `getResponsiveStylesHook` (the compiler does not compile the anonymous hook it returns).
- `React.memo` never hits when the parent passes fresh JSX children, inline arrows, inline objects or inline style arrays.
- `"use no memo"` at the top of a file turns the compiler off for that file only.
- Give list items stable keys (server ids such as `rec-001`); use `FlatList` for long lists.
- Clean up every timer, listener and subscription.

## React Native 0.86 Traps
- Never use `response.blob()` or `new Blob([arrayBuffer])`: both throw at once on RN 0.86.
- Use `StyleSheet.absoluteFill`; `absoluteFillObject` is removed.
- `ColorSchemeName` has a new value, `'unspecified'`: treat it as the light theme (`useThemeColors()`).
- Type timers as `ReturnType<typeof setTimeout>`; use `globalThis`, never `global`.

## Machine Checks
- `npm run lint` runs ESLint with `eslint.config.js` (on top of `eslint-config-expo` and `eslint-config-prettier`), then `prettier --check`. `eslint-config-expo` brings the React and React Hooks rules, the React Compiler checks among them; `react-hooks/exhaustive-deps` only warns: fix a warning like an error.
- Beyond the checks marked above, ESLint rejects: an `async` effect callback, `.only` and `.skip` in tests, an import cycle (`import/no-cycle`), a hex color outside `src/constants/UI_COLORS.ts` and `app.config.ts`, a font property (`fontSize`, `fontFamily`, `lineHeight`, `fontWeight`) outside `TextLine.tsx`, an import of `expo-file-system/legacy`, and the imports that have a wrapper: `Text`, `AppState` and `SafeAreaView` from `react-native`, and `useNavigation`.
- Each wrapper imports what it wraps: `TextLine.tsx` (`Text`), `useAppStateWatcher.ts` (`AppState`), `useAppNavigation.ts` (`useNavigation`). Only these three files and the unit tests (`__tests__/`) are free of the banned imports. `ScreenLayout` takes `SafeAreaView` from `react-native-safe-area-context`.
- The other exceptions in `eslint.config.js`: `console` inside `src/utils/logger/`, the method names `d`, `w` and `e` in `logger.ts`, the default export of `app.config.ts`, parameter edits in `plugins/`, the import check turned off for `tests/integration/support/startMock.mjs` (its relative import of the kit's mock), and `unknown` in the folders named under TypeScript.
- ESLint skips `android/`, `ios/`, `builds/`, `coverage/`, `docs/`, `mobile-engineer-candidate-kit/`, `.expo/` and the folders listed in `.git/info/exclude`.
