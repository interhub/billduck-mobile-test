---
paths:
  - "src/navigation/**"
  - "src/screens/**"
  - "App.tsx"
---

# Navigation

## Structure
- One root native stack, `createNativeStackNavigator<RootStackParamList>()` in `src/navigation/RootNavigator.tsx` (React Navigation 7). No tabs, no drawer, no nested navigators.
- `headerShown: false` for every screen; each screen draws its own header inside `ScreenLayout`.
- `NavigationContainer` lives in `App.tsx` with `ref={navRef}`.

| File | Owns |
|---|---|
| `src/navigation/RootNavigator.tsx` | The stack and its screens |
| `src/navigation/types.ts` | `enum SCREEN_NAME`, `RootStackParamList`, `AppNavigation` |
| `src/navigation/hooks/useAppNavigation.ts` | The typed navigation hook |
| `src/navigation/config/navRef.ts` | `navRef` for navigation outside React |

## Screens

| `SCREEN_NAME` | Component and folder | Params | Shows |
|---|---|---|---|
| `HOME` | `HomeScreen` in `src/screens/Home/` | none | The `BillDuck` header with the slogan ("Where does my money go?" / "Куда уходят мои деньги?"); the empty state with its picture, or the card of the current import (generated title, status); "Add statement", disabled with the caption "Finish or cancel the current upload first" while an operation is in progress; the `PendingCleanup` line while a cleanup runs; the link to `DIAGNOSTICS` at the bottom |
| `IMPORT_CONFIRM` | `ImportConfirmScreen` in `src/screens/Import/` | none | The original file name (only here, only in memory), size, format and the generated title it will be stored under; when a previous statement exists, the honest line "The current statement will be deleted from the server before the new one is sent"; "Send" and "Cancel" |
| `IMPORT_STATUS` | `ImportStatusScreen` in `src/screens/Import/` | none | A large honest status (Queued, Processing, Reconnecting…, Server unavailable, The file didn't reach the server, Error) with `ResponseTimeline` under it and the actions of the current phase ("Retry", "Send again", the quiet "Cancel upload", the quiet "Cancel" while queued or processing); pull to refresh reads the status again |
| `IMPORT_RESULT` | `ImportResultScreen` in `src/screens/Import/` | none | The recurring payments, the monthly total, "Details" on each payment, "Delete import"; pull to refresh reads the status again |
| `PAYMENT_DETAILS` | `PaymentDetailsScreen` in `src/screens/Import/` | `{paymentId: string}` | Merchant, amount, cadence, date of the last charge; no subscription cancel |
| `DIAGNOSTICS` | `DiagnosticsScreen` in `src/screens/Diagnostics/` | none | The API address and its `/health`, the mock scenario switch, the `/__test/state` counters, the event journal (answers with revisions, skipped stale answers, repeats, errors), "Reset all" (resets both the mock and the local operation) |

- `HOME` is the initial route. The link to `DIAGNOSTICS` at the bottom of `HOME` renders in every build of this test app, the ready-made release builds for the reviewer included; never hide it behind `__DEV__`. A production app would remove the screen with a build flag.
- Screen components are named exports: `export const HomeScreen = () => {...};`.

## Types

```ts
export enum SCREEN_NAME {
  HOME = 'HOME',
  IMPORT_CONFIRM = 'IMPORT_CONFIRM',
  IMPORT_STATUS = 'IMPORT_STATUS',
  IMPORT_RESULT = 'IMPORT_RESULT',
  PAYMENT_DETAILS = 'PAYMENT_DETAILS',
  DIAGNOSTICS = 'DIAGNOSTICS',
}

export type RootStackParamList = {
  [SCREEN_NAME.HOME]: undefined;
  [SCREEN_NAME.IMPORT_CONFIRM]: undefined;
  [SCREEN_NAME.IMPORT_STATUS]: undefined;
  [SCREEN_NAME.IMPORT_RESULT]: undefined;
  [SCREEN_NAME.PAYMENT_DETAILS]: {paymentId: string};
  [SCREEN_NAME.DIAGNOSTICS]: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
```

- `SCREEN_NAME` and every param type live only in `src/navigation/types.ts`, never in `src/constants/`.
- Always use `SCREEN_NAME` members, never route-name strings.

## Navigating
- In components: `const navigation = useAppNavigation();`. The hook returns the navigation object itself (`useNavigation<AppNavigation>()` inside). Never call `useNavigation` directly.
- Read params with `useRoute<RouteProp<RootStackParamList, SCREEN_NAME.PAYMENT_DETAILS>>()`.
- Outside React use `navRef` (`createNavigationContainerRef<RootStackParamList>()`), and only after `navRef.isReady()`. Never keep a navigation object in a module or a store.
- In React Navigation 7, `navigate` to a screen that is already lower in the stack pushes a new copy. Go back to it with `navigation.popTo(SCREEN_NAME.HOME)` or `navigation.goBack()`.

## Import Flow Rules
- Params carry ids only. Never pass the file, the operation, a result item or any text through params; screens read the operation from `importStore`.
- `PAYMENT_DETAILS` receives the server item id (`rec-001`) and looks the item up in `importStore`.
- The import controller never navigates; it only writes the operation. Screens decide where to go from the phase.
- Opening `IMPORT_RESULT` and pulling down on `IMPORT_STATUS` or `IMPORT_RESULT` ask the controller to read the status again; a screen never calls `importsApi` itself.
- "Send" replaces `IMPORT_CONFIRM` with `IMPORT_STATUS` (`navigation.replace`), so Back never returns to the confirm screen of a file already sent.
- Android Back on `IMPORT_STATUS` returns to `HOME`, which shows the live card of the operation. The operation lives in the controller and the repository, not in a screen: leaving a screen never cancels a send, a recovery, a poll or a delete.
- After the server confirms "Deleted", return with `navigation.popTo(SCREEN_NAME.HOME)`.

## Best Practices
- Keep navigation decisions in screens; presentational components receive `onPress` and never call the navigation hook.
- Add a screen in one change: the enum member, its params, the `RootNavigator` entry, the file in its feature folder.
