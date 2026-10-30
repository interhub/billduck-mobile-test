---
paths:
  - "src/hooks/**"
  - "src/screens/**/hooks/**"
  - "src/stores/**"
  - "src/utils/store/**"
---

# Custom Hooks

## Design
- Prefix with `use`, camelCase. One hook per file; the file name equals the hook name (`useThemeColors.ts`). Two kinds live elsewhere: the private `use<Component>Styles` hook at the bottom of its component file (`styling-and-theme.md`), and the hook a store file exports (`useImportStore` in `importStore.ts`).
- Named exports only, never `export default` (ESLint).
- Keep a hook focused: it does one thing well.
- Type every parameter and the return value explicitly; never `any`. Give optional parameters sensible defaults.
- Placement: a hook for one screen goes to `src/screens/<Feature>/hooks/`; a shared hook, or one mounted once in `App.tsx`, to `src/hooks/<category>/` (`sensors/`, `styles/`, `import/`); only the app start hook `useInitialAppLoading.ts` sits at the root of `src/hooks/`. No barrels.

## Return Values
- Return an object with descriptive keys (`{isRefreshing, refresh}`); return a single value only when it is the hook's whole purpose (`useThemeColors()` returns the palette).
- Keep the API minimal and named for the caller (`sendAgain`, `cancelUpload`, not `run`); never leak timers, refs or other internals.
- Document a complex hook with a short JSDoc: purpose, inputs, outputs.

## Memoization
- React Compiler is on: never add `useCallback` or `useMemo` only for performance.
- Keep manual memoization only where identity is load-bearing: a `useEffect` dependency that restarts work, the `useFocusEffect` callback, `FlatList` `renderItem`/`keyExtractor`/`data`, a custom `React.memo` comparator, a debounced function, a genuinely expensive computation.
- `"use no memo"` disables the compiler for one file.

## Effects
- Always give `useEffect`, `useMemo` and `useCallback` complete dependency arrays (ESLint `react-hooks/exhaustive-deps` warns; fix every warning).
- Keep the latest callback in a ref when a long-lived subscription must not re-subscribe on every render.
- Guard effects with early returns.
- Always clean up subscriptions, timers and listeners in the effect cleanup.
- Never make an effect callback `async` (ESLint): declare an inner async function and call it; handle its failure through `logger`.
- For work on screen focus use `useFocusEffect(useCallback(...))`; skip the first run with a ref when the mount already did the work.

```ts
export const useResumeImportOnForeground = (): void => {
  useEffect(() => {
    const unsubscribe = useAppStateStore.subscribe((state, previousState) => {
      if (state.isActive && !previousState.isActive) {
        importController.onForeground();
      }
    });
    return unsubscribe;
  }, []);
};
```

## Import Controller And Stores
- The import operation lives in `src/services/importController/`, never in a hook or a screen. Hooks and screens never upload, poll, retry or start timers for it.
- `src/stores/importStore.ts` mirrors the operation for the UI. Only the controller writes it; from `uploading` on, only after the repository has stored the operation with `await AsyncStorage.setItem`.
- Screens and hooks read `importStore` and call the controller's actions; they never write into the store. The 13 actions (`createImportController.ts`): `restore`, `resume`, `pickFile`, `send`, `cancelDraft`, `sendAgain`, `retry`, `cancelUpload`, `deleteImport`, `refreshStatus`, `onForeground`, `runCleanups`, `forgetEverything`.
- Controller actions never reject: the controller logs every failure and turns it into a phase, a timeline row, a dropped draft or a step that stops on purpose. A screen or a hook starts an action with `void` (`void importController.retry();`), or awaits it when it needs the result (`const isPicked = await importController.pickFile();`), and adds no `catch`.
- Never persist the operation through the Zustand `persist` middleware: its writes are not awaited, so a key could leave the device before it is stored. The store factory keeps every store in memory and has no persist mode; the repository owns AsyncStorage.
- Leaving or unmounting a screen never cancels, resets or loses the operation. Leaving `IMPORT_CONFIRM` drops only a draft that was never sent, together with its copy.
- Shared import hooks (`src/hooks/import/`) read the stores, call controller actions and keep only UI state of their own (`useStatusRefresh` holds the pull spinner).

## Zustand
- Create every store with `createZustandStorageHook` from `src/utils/store/createZustandStore.ts`; one flat `xxxStore.ts` per domain in `src/stores/`.
- Select one primitive per call (`useImportStore((state) => state.operation?.phase)`), or wrap an object selector in `useShallow` from `zustand/react/shallow`. In Zustand 5 a selector that builds a new object or array on every call loops renders.
- Outside React read with `useXxxStore.getState()` and listen with `useXxxStore.subscribe`.
- Keep local `useState` for transient UI state only (the pull spinner of `useStatusRefresh`, the busy flag of `useMockDiagnostics`).

## App State
- Exactly one `AppState` listener: `useAppStateWatcher` (`src/hooks/sensors/useAppStateWatcher.ts`), mounted once in `App.tsx`, writes `appStateStore` (`isActive`, and the language again on every return to the foreground).
- Never call `AppState.addEventListener` anywhere else; ESLint rejects an `AppState` import from `react-native` in other files (Machine Checks in `rn-code-styles.md`). React code that needs the foreground state reads `useAppStateStore((state) => state.isActive)`.
- The controller reads the store through `appActivity` (`src/services/importController/appActivity.ts`): polling stops in the background, and a pause of the recovery or of a cleanup ends only in the foreground.
- `useResumeImportOnForeground` (`src/hooks/import/useResumeImportOnForeground.ts`), mounted once in `App.tsx`, tells the controller about the return: `importController.onForeground()` resumes the polling, reads a ready job again and runs the pending cleanups.
- JS timers keep firing for a while after the app goes to the background, so background pauses are decided by `appStateStore`, never by assuming timers stop.

## Reduce Motion
- One shared hook, `useReduceMotion` (`src/hooks/sensors/useReduceMotion.ts`): it reads `AccessibilityInfo.isReduceMotionEnabled()` on mount, follows the `reduceMotionChanged` event, and removes that subscription in cleanup.
- Every animated component asks this hook and shows the end state without animation while it returns `true`.

## Texts And Platform
- A hook that shows user-facing text takes it by key through `useTranslation()` (`src/i18n/useTranslation.ts`); never a literal string.
- The language follows the system and is read again when the app returns to the foreground: on Android the activity is not recreated on a language change.
- Gate platform-specific behaviour inside the hook with `Platform.OS`.
