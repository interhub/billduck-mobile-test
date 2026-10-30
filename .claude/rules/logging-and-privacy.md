# Logging And Privacy

## One Logger
- Log only through `logger` (`src/utils/logger/`) with event names from `LOG_NAME` (`src/utils/logger/LOG_NAME.ts`): snake_case values, a one-line English comment above each member.
- `logger.d(LOG_NAME.xxx, params)` - a technical step: phase change, upload result, recovery result.
- `logger.w(LOG_NAME.warning_log, {type, ...})` - a non-failure worth seeing: a fallback that worked, a stale status that was skipped.
- `logger.e(LOG_NAME.error_log, {type, error_kind, http_status, ...})` - a failure.
- In debug builds (`__DEV__`) the logger prints to the console; in release builds it is silent. There is no analytics or crash SDK, and the logger sends nothing anywhere.
- The logger itself drops every field outside the table below (`ALLOWED_LOG_KEYS` in `logger.ts`) and every value that is not a flat primitive, and cuts strings to 64 characters.
- Never call `console.*` outside `src/utils/logger/` (ESLint `no-console`).
- The method names `d`, `w` and `e` are the one exception to the short-name rule: ESLint `id-denylist` is off for `src/utils/logger/logger.ts` alone.

## Parameters
- Flat primitives only: string, number, boolean, null, with short snake_case keys (`job_id`, not `jobId`).
- Never pass an object, an array, an `Error`, a response, a file asset or the operation (`error`, `payload`, `...operation`, `params`). List the few fields you need by hand.
- Event names are whole `LOG_NAME` members. Never build one with a template literal or concatenation; choosing between ready members is fine.
- Enum-like values (`type`, `phase`, `format`, `error_kind`) come from closed dictionaries: `LOG_TYPE` (next to `LOG_NAME`), `ImportPhase`, `StatementFormat`, `ERROR_KIND`. A variable part goes into its own parameter, never glued into a value.
- Never write a wrapper function only to log; log inside the function that does the work.

## Allowed Fields (closed list)

| Key | Value |
|---|---|
| `type` | `LOG_TYPE` member naming the operation (the list below) |
| `job_id` | Server job id |
| `phase` | `ImportPhase` value |
| `revision` | Server revision number |
| `format` | `pdf` or `csv` |
| `size_kb` | File size rounded to kilobytes |
| `error_kind` | `ERROR_KIND` value (`network`, `timeout`, `server`, `validation`, `unknown`) |
| `http_status` | HTTP status number, or null |
| `attempt` | Attempt number of a repeated call |

- Anything not in this table is not logged until this table and `ALLOWED_LOG_KEYS` are extended.
- `LOG_TYPE` (`src/utils/logger/LOG_NAME.ts`), one member per operation: `create_import` (every POST of a statement), `recover_by_key` (a lookup by the idempotency key), `poll_job` (a status read), `delete_import` (the deletion of an import), `cleanup_upload` (the deletion of a cancelled upload), `pick_file` (picking and checking a file), `read_copy` and `remove_copy` (our private copy), `restore_operation` (reading the stored operation at launch), `load_fonts`, `hide_splash`, `system_background`, `mock_control` (the test routes from the diagnostics screen), `reset_all` (forgetting the import on this phone).

## Never Log, Never Put Into Errors
- File bytes, including the header bytes read for the format check.
- The original file name (`asset.name`): it is never logged, never shown in an error, never stored and never sent to the server. The generated names (the on-screen title, `serverFileName`) are not in the allowed list either: log `format` and `size_kb`.
- File URIs and paths: they can carry the original file name.
- Transaction descriptions, merchant names, and the result items as a whole.
- `idempotencyKey` and `deleteKey`: the idempotency key alone reads the job through `GET /imports/by-key/{key}`.
- Native error messages (`error.message`, `String(error)`): file APIs embed the path, and Android puts a rejected header value into the error text. Turn a failure into `{kind, httpStatus}` through `resolveErrorKind` and log only that.
- Error results and our own `Error` objects carry `kind` and `httpStatus` only, never a message built from user data.
- UI error texts come by key through `useTranslation()`, chosen by phase and error kind, and never interpolate a file name or a merchant.

```ts
// Good: allowed fields only, the generated ASCII name in the header
logger.d(LOG_NAME.import_phase_changed, {job_id: jobId, phase: 'ready', revision: 3});
logger.e(LOG_NAME.error_log, {
  type: LOG_TYPE.create_import,
  error_kind: error.kind,
  http_status: error.httpStatus
});
const uploadHeaders = {
  'Idempotency-Key': request.idempotencyKey,
  'X-File-Name': request.serverFileName
};

// Bad: the original name in a log, a header and an error text, a raw error, a built event name
logger.d(LOG_NAME.debug_log, {type: LOG_TYPE.pick_file, file_name: asset.name});
const leakingHeaders = {'Idempotency-Key': request.idempotencyKey, 'X-File-Name': asset.name};
throw new Error(`Cannot read ${asset.name}`);
logger.e(LOG_NAME.error_log, {type: LOG_TYPE.create_import, error});
logger.d(`import_${phase}` as LOG_NAME);
```

## Data On The Device And Off It
- The file leaves the device only to `ENV.API_BASE_URL` (`src/config/env.ts`), as raw bytes with the headers the contract requires.
- `X-File-Name` carries only the generated `serverFileName`, such as `statement-20261029-1432.pdf` (Latin letters, digits, hyphen and dot): the real name never leaves the phone. A header with Cyrillic letters or emoji would also fail on Android before sending.
- On screen the operation is a generated title ("Statement · 29 Oct, 14:32 · PDF · 2.4 KB", "Выписка · 29 окт, 14:32 · PDF · 2,4 КБ"), built at render time from `createdAt`, format and size in the current language and never stored. The original name appears only on `IMPORT_CONFIRM`, from memory.
- Never read the whole file into JS memory; read only the first bytes for the format check (`network-and-import-policy.md`).
- The stored state is the minimum: the `ImportOperation` and the `PendingCleanup` list, with no original name and no payments (they are read from the server again after a relaunch).
- File copies live only in `Paths.cache/imports/`, named by `operationId`, never by the original name; the picker's own copies, the iOS `tmp/<bundle id>-Inbox` copy included, are deleted (`network-and-import-policy.md`).
- The stored operation and every temp copy are removed once the server confirms `deleted`.
- Backups: `android.allowBackup: false`. On iOS nothing reaches a backup: the file copies live in `Caches`, which iOS never backs up, and AsyncStorage marks its own folder as excluded from backups by default (`RCTAsyncStorageExcludeFromBackup` stays unset).
- The diagnostics screen and `ResponseTimeline` show only the API address and its `/health`, the mock scenario, counters and jobs (id, status, revision, size), the stored phase, job id and revision, the counts of pending cleanups and skipped answers, and events with time, status, revision, HTTP status, attempt and repeat count; never file names, file bytes, merchants or amounts.

## Secrets
- The project holds no secrets. `EXPO_PUBLIC_*` values are compiled into the app bundle: never put a secret, token or key there, or anywhere in the repo.
- A key for an outside service (the image generation key, for example) goes only into the environment of the one command that needs it and is never exported into the shared terminal environment.
- `idb_companion` writes every environment variable into its log: always start it with `2>/dev/null` and never keep its logs.
- `scripts/make-archive.sh` packs only after its leak search finds nothing. It searches the files of every commit of the clone it packs and every commit message for home folder paths of macOS and Linux, key-shaped strings (generic secret keys, AWS, GitHub, Google and Slack tokens, PEM private keys) and, when the local file `.git/info/archive-blocklist` exists, the names of other projects listed there (one per line, `#` comments allowed, never committed). Any match prints its commit and path and stops the script with exit code 1 before anything is copied or zipped.
- So no rule, document or commit message ever holds a literal home folder path or a key-shaped string, even as an example: the archive would not build.
