# Project Structure And Reuse

## Scope
- Answers two questions before any code is written: where does this file go, and what already exists that does this.
- The conventions themselves live in the sibling rules: `rn-code-styles.md`, `styling-and-theme.md`, `ui-kit.md`, `custom-hooks.md`, `navigation.md`, `icons-and-images.md`, `logging-and-privacy.md`, `network-and-import-policy.md`, `expo-config-and-native.md`, `testid-and-accessibility.md`, `testing.md`.
- The requirements, the architecture decisions and the brand are collected in `docs/PROMPT.md`. When a rule and that document disagree, the document wins.
- Import with the alias `@/...` (`tsconfig.json` maps `@/*` to the repo root): `@/src/...` for code, `@/assets/...` for fonts and pictures, `@/tests/...` for the integration helpers: `import {TextLine} from '@/src/components/ui/TextLine';`. Relative imports only between siblings of one folder (`./App` in `index.ts`).
- ESLint rejects an import that climbs to a parent folder (`../`). The one exception is `tests/integration/support/startMock.mjs`: a plain Node process without the alias that imports the kit's `mock-server.mjs` by a relative path.
- Code, comments and documents never contain absolute paths from a developer machine, or names and paths of other projects.

## The Folder Map

| Path | What lives there |
|---|---|
| `index.ts`, `App.tsx` | Entry (`index.ts` registers `App`): providers, splash hold, the language at launch, the app start hook, the single `AppState` watcher, the foreground hook of the import, the system background, navigation |
| `app.config.ts` | The whole Expo config: identity, icons, splash, languages, network, permissions, backups, plugins |
| `plugins/` | Own config plugins, each safe to run on every prebuild |
| `package.json`, `package-lock.json`, `.nvmrc` | The npm scripts and packages, the locked versions, Node 22 |
| `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore` | The `@/*` alias and strict TypeScript, the ESLint checks (`rn-code-styles.md`), the Prettier settings, the ignore lists |
| `jest.config.js`, `jest.setup.js`, `jest.globalSetup.js`, `jest.integration.config.js` | The unit and integration Jest configs and their setup (`testing.md`) |
| `assets/fonts/` | Unbounded, Geist, Geist Mono TTF files and their OFL licenses |
| `assets/images/` | `icon.png`, `adaptive-icon-foreground.png`, `splash-icon.png`, and the duck of the header logo in `logo-mark@2x.png` and `logo-mark@3x.png` |
| `assets/illustrations/` | `bd_*.png` and `bd_*-dark.png` in `@2x` and `@3x` |
| `mobile-engineer-candidate-kit/` | Byte-for-byte copy of the candidate kit (mock server, its tests, fixtures); never edited |
| `scripts/` | Helpers for the reviewer and the archive (`push-fixtures.sh`, `save-test-results.sh`, `make-archive.sh`) |
| `src/api/` | `apiResult.ts` (`failure`, `failureForStatus`: the failed `ApiResult` of every call) and one folder per service |
| `src/api/importsApi/` | `importsApi.ts` (POST, by-key, GET, DELETE), `readImportJob.ts` (the typed guard of a job answer), `httpRequest.ts` (timed requests), `nativeFileUploader.ts` (the streaming upload) and `mockControlApi.ts` (`/__test/*` and `/health`) |
| `src/components/ui/` | The shared UI kit, flat (`ui-kit.md`) |
| `src/config/env.ts` | `ENV`, read from `EXPO_PUBLIC_*` |
| `src/constants/` | Flat registries: `UI_COLORS`, `UI_SIZES`, `UI_MOTION`, `FONT_NAME`, `LIMITS`, `BYTE_UNITS`, `IMPORT_STATUS`, `HTTP_STATUS` |
| `src/hooks/` | Hooks shared by more than one screen or mounted once in `App.tsx`, in `sensors/`, `styles/`, `import/`; the app start hook `useInitialAppLoading.ts` sits at the root |
| `src/i18n/` | `translationsEn.ts` and `translationsRu.ts` (every UI string, the same keys in both), `translations.ts` (`LANGUAGE` and the `TRANSLATIONS` map), `resolveSystemLanguage.ts` and `useTranslation.ts` |
| `src/navigation/` | `RootNavigator.tsx`, `types.ts`, `hooks/useAppNavigation.ts`, `config/navRef.ts` |
| `src/screens/<Feature>/` | `Home/`, `Import/` (confirm, status, result, payment details), `Diagnostics/`; the screen file at the root, then `components/`, `hooks/`, `logic/` |
| `src/services/importController/` | The long-lived import controller, split into modules by job (below), and the operation repository |
| `src/stores/` | `importStore.ts`, `appStateStore.ts` |
| `src/types/` | `importApi.ts`, `importOperation.ts`, `importDraft.ts`, `statementFiles.ts`: the API, operation, draft and statement file types shared across modules |
| `src/utils/` | Helpers by concern: `logger/`, `errors/`, `files/`, `import/`, `format/`, `promise/`, `styles/`, `store/`, `json/` |
| `tests/integration/` | Tests against the real mock (`testing.md`); `support/` holds the mock launcher, the Jest global setup and teardown, and the Node phone |
| `docs/` | `qa-report/` (the QA report with screenshots), `test-results/` (saved test output), `PROMPT.md`; never imported |
| `README.md`, `RELEASE_NOTE.md`, `SELF_REVIEW.md` | Documents for the reviewer |
| `.claude/rules/` | These rules; they ship in the archive |

- `ios/` and `android/` are generated by prebuild and git-ignored; nothing is written there by hand (`expo-config-and-native.md`).
- `builds/` (the ready-made release builds) and `video/` are git-ignored; `scripts/make-archive.sh` copies them into the archive.

## The Import Controller Modules
- `createImportController.ts` builds one `ControllerContext` (`importControllerTypes.ts`: the dependencies, the runtime memory, the write queue, the single flights, the cleanup runner) and returns the 13 actions (`custom-hooks.md`); `importController.ts` is the one instance of the app. The other modules export plain functions of that context and import each other in one direction only (ESLint `import/no-cycle`).
- `controllerCore.ts`: store reads, disk writes before the store mirror, phase events through the reducer, timeline rows, run tokens, pending cleanups, the wait for the foreground.
- `draftFlow.ts`: picking and checking a file, dropping a draft.
- `sendFlow.ts`: "Send", the deletion of the previous statement before it, "Send again".
- `uploadFlow.ts`: the POST and the recovery by key after a lost answer.
- `jobAnswers.ts`: server answers through the reducer, "Deleted", "Not on the server", the key check of a stored job.
- `jobPolling.ts`: the status polling.
- `deletionFlow.ts`: the DELETE and the wait for `deleted`.
- `cleanupFlow.ts`: "Cancel upload" and the `PendingCleanup` passes.
- `retryFlow.ts`: "Retry", the status read outside polling, the checks after a restart.
- `controllerLifecycle.ts`: restore and resume at launch, the return to the foreground, "Reset all".
- `appActivity.ts`: the foreground state read from `appStateStore`. `operationRepository.ts`: the only writer of the stored state.

## Where A New File Goes
- Component used by one screen: `src/screens/<Feature>/components/`. Used by two or more screens: `src/components/ui/`. Move it up on the second consumer, not in anticipation of one.
- Hook used by one screen: `src/screens/<Feature>/hooks/`. Shared, or mounted once in `App.tsx`: `src/hooks/<category>/`; only the app start hook `useInitialAppLoading.ts` lives at the root of `src/hooks/`.
- Screen-only pure logic (no React, no JSX): `src/screens/<Feature>/logic/`.
- The import operation has fixed homes and never lives in a screen: phase reducer, revision guard, phase groups, run tokens and the other pure decisions of the controller in `src/utils/import/`, size and signature checks, generated names and temp copies in `src/utils/files/`, HTTP in `src/api/importsApi/`, orchestration and persistence in `src/services/importController/`, the UI mirror in `src/stores/importStore.ts`.
- Money, date and file size formatting, and the date stamp of the server file name: `src/utils/format/`. Waits, repeat ladders, the poll loop, single flights, coalesced runs and the write queue: `src/utils/promise/`. JSON parsing for typed guards: `src/utils/json/`.
- UI strings: only `src/i18n/translationsEn.ts` and `src/i18n/translationsRu.ts`, both languages in the same change.
- Types: local types stay next to their consumer; only types crossing modules go to `src/types/`.
- Global state: one flat `xxxStore.ts` per domain in `src/stores/`, never inside a feature folder. Read the list before adding one.
- A constant other files read goes into an existing registry in `src/constants/` when one fits; a new registry file only for a genuinely new category.
- A new external endpoint gets its own folder under `src/api/`; never add calls for another service into `importsApi`.

## When To Create A Subfolder
- Group a folder once it passes roughly 15 loose files; below that, flat is easier to scan.
- Group by domain, not by file type; a subfolder name is a camelCase noun for what it owns.

## Naming By File Type

| Kind | Pattern | Example |
|---|---|---|
| Screen | `XxxScreen.tsx` | `screens/Import/ImportStatusScreen.tsx` |
| Navigator | `XxxNavigator.tsx` | `navigation/RootNavigator.tsx` |
| Component | PascalCase | `components/ui/MainButton.tsx` |
| Hook | `useXxx.ts`, file name equals the hook | `hooks/styles/useThemeColors.ts` |
| Store | `xxxStore.ts` | `stores/importStore.ts` |
| Logic or util module | camelCase | `utils/format/formatMoney.ts` |
| Constants registry | UPPER_SNAKE_CASE | `constants/LIMITS.ts` |
| Unit test | `__tests__/<module>.test.ts` next to the code, `.tsx` when it renders JSX, `<module>.<topic>.test.ts` when one module has several test files | `utils/import/__tests__/importReducer.upload.test.ts` |
| Test helper | camelCase without `.test`, in the `__tests__/` folder of its tests | `services/importController/__tests__/controllerHarness.ts` |
| Integration test | `tests/integration/<flow>.test.ts`, helpers in `tests/integration/support/` | `tests/integration/importFlow.test.ts` |

- Two kinds of hooks do not get a file of their own: the `use<Component>Styles` hook stays private at the bottom of its component file (`styling-and-theme.md`), and a store file exports its store hook (`useImportStore` in `importStore.ts`).

## Barrels
- Never add `index.ts` barrel files. Every import points at the real file. ESLint rejects `export * from` and `export {...} from`.
- Barrels pull unrelated modules into one import graph and invite cycles.

## Check Before You Write
Hook names equal file names, so a name search finds them. Small helpers hide inside bigger files, so also search the API they wrap.

```
find src -name "use*<Word>*.ts*"                        # is this hook already written
ls src/components/ui src/stores src/constants           # the kit, the stores, the registries
grep -rn "<name>" src/constants src/navigation/types.ts src/i18n/translationsEn.ts
grep -rn "formatMoney\|formatDate\|formatFileSize" src  # formatting already exists
grep -rl "<SymbolName>" src | wc -l                     # 1 means it is dead code
```

## Registries To Read Before Inventing A Value

| Registry | Owns |
|---|---|
| `src/constants/UI_COLORS.ts` | Light and dark palettes, `PAYMENT_DOT_COLORS` |
| `src/constants/UI_SIZES.ts` | `SPACING`, `RADIUS`, `TOUCH_TARGET`, `ICON_SIZE`, `SCREEN_PADDING`, `BORDER_WIDTH`, `DISABLED_OPACITY`, `STATUS_DOT_SIZE`, `STATUS_RING_SIZE`, `STATUS_RING_BORDER_WIDTH`, `STATUS_BADGE_PADDING`, `PAYMENT_DOT_SIZE`, `ILLUSTRATION`, `LOGO` |
| `src/constants/UI_MOTION.ts` | `MOTION`: durations, easing, press scale, status pulse |
| `src/constants/FONT_NAME.ts` | Font families |
| `src/constants/LIMITS.ts` | File size limit, format header length, timeouts, recovery delays, polling, backoff and silence limits, cleanup pause and reads, timeline length |
| `src/constants/BYTE_UNITS.ts` | `KILOBYTE` and `MEGABYTE` in bytes, counted by 1024 like the server's limit |
| `src/constants/IMPORT_STATUS.ts` | Job statuses the server returns, `DELETION_STATUSES` |
| `src/constants/HTTP_STATUS.ts` | HTTP status codes the app reads or records |
| `src/utils/logger/LOG_NAME.ts` | `LOG_NAME` and `LOG_TYPE` |
| `src/utils/errors/resolveErrorKind.ts` | `ERROR_KIND` and the only error classifier |
| `src/navigation/types.ts` | `SCREEN_NAME` and every route param |
| `src/i18n/translationsEn.ts`, `translationsRu.ts` | Every UI string, English and Russian with the same keys (the `Translation` type comes from the English file) |

- An enum or a constant list that belongs to one module lives in it, and other files import it from there: `TIMELINE_EVENT` (`src/utils/import/importTimeline.ts`), the phase groups `POLLING_PHASES`, `DELETION_PHASES`, `STORED_PHASES` and `BadgePhase` (`src/utils/import/importPhases.ts`), `STATEMENT_REJECTION` (`src/utils/files/checkStatementFile.ts`), `MOCK_SCENARIO`, `MOCK_SCENARIOS`, `MOCK_COUNTER_KEYS` (`src/api/importsApi/mockControlApi.ts`).

## Reuse Catalogue
Paths are under `src/` unless they start with `tests/`.
- Styling: `utils/styles/getResponsiveStylesHook`, `hooks/styles/useThemeColors`, `hooks/styles/useSystemBackground` (mounted once in `App.tsx`).
- UI kit (`components/ui/`): `TextLine`, `MainButton`, `ScreenLayout`, `ScreenHeader`, `Card`, `InfoRow`, `StatusBadge`, `ResponseTimeline`, `MonthlyTotal`, `OptionalText`, `Illustration`, `TouchableScaleView`. Parts of one screen stay in it: `PaymentRow` (`screens/Import/components/`), `BillDuckLogo` (`screens/Home/components/`).
- Texts: `i18n/useTranslation` (`{t, language}`), strings in `i18n/translationsEn` and `i18n/translationsRu`, `LANGUAGE` in `i18n/translations`, `i18n/resolveSystemLanguage`.
- Formatting (`utils/format/`): `formatMoney` (`formatMoney`, `formatMonthlyTotal`, `sumMinorAmounts`), `formatDate` (`formatCalendarDate`, `formatLocalDateTime`, `formatLocalTime`, `padTwoDigits`), `formatFileSize` (`formatFileSize`, `formatExactBytes`, `toKilobytes`), `formatStatementTitle`, `formatFileStamp`, `describeCadence`.
- Waits and repeats (`utils/promise/`): `wait`, `runDelayLadder`, `runPollLoop`, `createSingleFlight`, `createCoalescedRunner`, `createSerialQueue`.
- Import rules (`utils/import/`, pure): `importReducer`, `revisionGuard`, `importPhases`, `importPolicy`, `retryAction`, `pollSilence`, `runToken`, `importTimeline`, `canAddStatement`.
- Files (`utils/files/`): `statementFileStore`, `checkPickedStatement`, `checkStatementFile`, `buildServerFileName`.
- JSON and API results: `utils/json/parseJson` (`parseJson`, `isRecord`), `api/apiResult` (`failure`, `failureForStatus`), `api/importsApi/readImportJob`.
- Logging and errors: `utils/logger/logger` + `LOG_NAME`, `utils/errors/resolveErrorKind`.
- State: `createZustandStorageHook` from `utils/store/createZustandStore` - the only way to make a store.
- App state: `hooks/sensors/useAppStateWatcher` (mounted once in `App.tsx`) feeding `stores/appStateStore`; `hooks/import/useResumeImportOnForeground` (mounted once in `App.tsx`) tells the controller about the return to the foreground.
- Import screens: `hooks/import/useImportSubject` (what the import screens talk about), `hooks/import/useStatusRefresh` (pull to refresh).
- Reduce Motion: `hooks/sensors/useReduceMotion`.
- App start: `hooks/useInitialAppLoading` (fonts and the stored operation, then the splash hides and the controller resumes; the language is set in `App.tsx` before the first render).
- Navigation: `navigation/hooks/useAppNavigation` (never `useNavigation` directly), `navigation/config/navRef` outside React.
- Config: `config/env` (`ENV`).
- Test helpers (`testing.md`): `services/importController/__tests__/` (`controllerHarness`, `controllerWaits`, `fakeImportBackend` with `fakeServer`, `fakeImportsApi` and `fakeStatementFiles`, `importScenarios`), `utils/import/__tests__/importFixtures`, `utils/files/__tests__/kitFixtures`, `api/importsApi/__tests__/mockReadyReport`, and `tests/integration/support/` (`importTestEnvironment`, `nodeNetwork`, `nodeFileStore`).
