---
paths:
  - "src/hooks/**"
  - "src/screens/**/hooks/**"
  - "src/stores/**"
  - "src/utils/store/**"
---

# Custom Hooks

## Design
- Prefix with `use`, camelCase. One hook per file; the file name equals the hook name (`useThemeColors.ts`).
- Named exports only, never `export default`.
- Keep a hook focused: it does one thing well.
- Type every parameter and the return value explicitly; never `any`. Give optional parameters sensible defaults.
- Placement: a hook for one screen goes to `src/screens/<Feature>/hooks/`, a shared hook to `src/hooks/<category>/` (`sensors/`, `styles/`, `import/`); only the app start hook `useInitialAppLoading.ts` sits at the root of `src/hooks/`. No barrels.

## Return Values
- Return an object with descriptive keys (`{operation, isBusy}`); return a single value only when it is the hook's whole purpose (`useThemeColors()` returns the palette).
- Keep the API minimal and named for the caller (`sendAgain`, `cancelUpload`, not `run`); never leak timers, refs or other internals.
- Document a complex hook with a short JSDoc: purpose, inputs, outputs.

## Memoization
- React Compiler is on: never add `useCallback` or `useMemo` only for performance.
- Keep manual memoization only where identity is load-bearing: a `useEffect` dependency that restarts work, the `useFocusEffect` callback, `FlatList` `renderItem`/`keyExtractor`/`data`, a custom `React.memo` comparator, a debounced function, a genuinely expensive computation.
- `"use no memo"` disables the compiler for one file.

## Effects
- Always give `useEffect`, `useMemo` and `useCallback` complete dependency arrays.
- Keep the latest callback in a ref when a long-lived subscription must not re-subscribe on every render.
- Guard effects with early returns.
- Always clean up subscriptions, timers and listeners in the effect cleanup.
- Never make an effect callback `async`: declare an inner async function and call it; handle its failure through `logger`.
- For work on screen focus use `useFocusEffect(useCallback(...))`; skip the first run with a ref when the mount already did the work.

```ts
export const useAppActiveChange = (onActiveChange: (isActive: boolean) => void): void => {
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);
  useEffect(() => {
    const unsubscribe = useAppStateStore.subscribe((state, previousState) => {
      if (state.isActive === previousState.isActive) {
        return;
      }
      onActiveChangeRef.current(state.isActive);
    });
    return unsubscribe;
  }, []);
};
```

## Import Controller And Stores
- The import operation lives in `src/services/importController/`, never in a hook or a screen. Hooks and screens never upload, poll, retry or start timers for it.
- `src/stores/importStore.ts` mirrors the operation for the UI. Only the controller writes it; from `uploading` on, only after the repository has stored the operation with `await AsyncStorage.setItem`.
- Screens read `importStore` and call controller actions (for example `pickFile`, `send`, `retry`, `sendAgain`, `cancelUpload`, `refreshStatus`, `deleteImport`); they never write into the store.
- Never persist the operation through the Zustand `persist` middleware: its writes are not awaited, so a key could leave the device before it is stored. The store factory has no persist mode: `importStore` is a `STORAGE_TYPE.SESSION` store; the repository owns AsyncStorage.
- Leaving or unmounting a screen never cancels, resets or loses the operation.
- Shared import hooks (`src/hooks/import/`) only select from `importStore` and hand out controller actions.

## Zustand
- Create every store with `createZustandStorageHook` from `src/utils/store/createZustandStore.ts`; one flat `xxxStore.ts` per domain in `src/stores/`.
- Select one primitive per call (`useImportStore((state) => state.operation?.phase)`), or wrap an object selector in `useShallow` from `zustand/react/shallow`. In Zustand 5 a selector that builds a new object or array on every call loops renders.
- Outside React read with `useXxxStore.getState()` and listen with `useXxxStore.subscribe`.
- Keep local `useState` for transient UI state only (a pressed row, an open sheet).

## App State
- Exactly one `AppState` listener: `useAppStateWatcher` (`src/hooks/sensors/useAppStateWatcher.ts`), mounted once in `App.tsx`, writes `appStateStore`.
- Never call `AppState.addEventListener` anywhere else. React code reads `useAppStateStore((state) => state.isActive)`; the controller subscribes to the store to stop polling while the app is not active and, on return, to resume it, to read the status again after `ready` and to run the pending cleanups.
- JS timers keep firing for a while after the app goes to the background, so background pauses are decided by `appStateStore`, never by assuming timers stop.

## Reduce Motion
- One shared hook, `useReduceMotion` (`src/hooks/sensors/useReduceMotion.ts`): it reads `AccessibilityInfo.isReduceMotionEnabled()` on mount, follows the `reduceMotionChanged` event, and removes that subscription in cleanup.
- Every animated component asks this hook and shows the end state without animation while it returns `true`.

## Texts And Platform
- A hook that shows user-facing text takes it by key through `useTranslation()` (`src/i18n/useTranslation.ts`) from `src/i18n/translations.ts`; never a literal string.
- The language follows the system and is read again when the app returns to the foreground: on Android the activity is not recreated on a language change.
- Gate platform-specific behaviour inside the hook with `Platform.OS`.
