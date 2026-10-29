---
paths:
  - "**/__tests__/**"
  - "tests/**"
  - "jest*.config.*"
  - "mobile-engineer-candidate-kit/**"
---

# Testing

## Tools And Commands
- `jest` with the `jest-expo` preset and `@testing-library/react-native`, in the versions Expo SDK 57 recommends (`npx expo install`).
- npm scripts in `package.json`: `npm test` (unit), `npm run test:integration`, `npm run typecheck` (`tsgo --noEmit`), `npm run lint`, `npm run mock` (the server from `mobile-engineer-candidate-kit/` on `127.0.0.1:8787` for simulators and emulators), `npm run check` (all of them at once).
- Unit and integration runs use separate Jest configs, so `npm test` never needs the mock.
- A change is done only when `npm run check` is green: `test`, `test:integration`, `typecheck` and `lint`.
- The output of every full run is saved to `docs/test-results/` as a text file with the date, the command and the result; the folder ships in the archive.
- `mobile-engineer-candidate-kit/` is a byte-for-byte copy of the kit: never edit its server, tests or fixtures. `diff -r` against the original kit is empty; the only files that may appear later are the ones the kit's own `.gitignore` lists (`fixtures/oversize.csv`, `.mock-state.json`). `npm test` inside the kit checks the mock itself.

## Unit Tests
- Live in `__tests__/` next to the code: `src/utils/import/__tests__/importReducer.test.ts`.
- No network and no native modules. Native imports (`expo-file-system`, `expo-crypto`, `expo-document-picker`, `expo-localization`) sit in thin adapter files; the controller and the API client receive the uploader, file reader, temp file store, clock and key generator as parameters, so tests pass fakes.
- AsyncStorage comes from its official Jest mock (`@react-native-async-storage/async-storage/jest/async-storage-mock`).
- Cover the pure parts first: the phase reducer, the revision guard and the binding of answers to the operation, the size and signature checks (with bytes from `mobile-engineer-candidate-kit/fixtures/`), the generated names, money, date and file size formatting.
- Components: query by role, label or testID, never by style or tree position.

## Integration Tests
- Live in `tests/integration/` and drive the API client and the import controller through Node `fetch` against the real mock.
- Start the mock in Jest `globalSetup` as a separate `node` process, never by importing `mock-server.mjs` into Jest: it is an ES module and the import breaks there. A launcher script in `tests/integration/` calls `createMockServer({statePath})` with a temp state file, listens on port 0 and prints the port; `globalSetup` waits for it and puts the base URL into an env variable; `globalTeardown` stops the process and deletes the temp folder.
- The native upload is replaced by a Node uploader that sends the same bytes with the same headers (`Content-Type`, `Idempotency-Key`, `X-File-Name`).
- Every request the client sends goes through a recorder, so tests can check it against the contract.
- Every test starts with `POST /__test/reset`, then sets its scenario with `POST /__test/scenario`.
- Run with `--runInBand`: all files share one mock process with its own port and state file.
- Assert the server side through `GET /__test/state` counters (`createRequests`, `newJobs`, `duplicateHits`, `acceptedBytes`, `deleteRequests`), not only through client state.
- `oversize.csv` is ignored by the kit's own `.gitignore`: `globalSetup` creates it with the kit's `npm run fixtures:oversize`, run inside `mobile-engineer-candidate-kit/`.

## Mandatory Tests
1. The key is stored before the upload starts: the fake uploader reads storage at the moment it is called and finds the operation with that key. After a "crash" (a new controller on the same storage) the same key is used, and the relaunch only reads by key: no POST on its own.
2. `lost_ack` gives one job through the automatic recovery, with no button pressed: the first POST gets no answer, the controller moves to `reconnecting`, finds the job by key and reaches `ready`; `newJobs = 1`, after a relaunch too. A repeated POST with the same key and the same bytes returns the same job and raises `duplicateHits`, never `newJobs`.
3. `stale_status`: after `ready` r3, a second status read that answers `processing` r2 leaves the phase `ready`, and the timeline holds that answer marked as skipped.
4. `delete_failure`: the 503 gives `delete_failed`; after switching to `happy`, "Retry" with the same `deleteKey` reaches `deleted`, and "Deleted" appears only after that `GET`.
5. `spoofed.pdf` and `oversize.csv` are rejected before the network: `createRequests` does not change.
6. Contract: every recorded request matches the mock contract. `POST /imports` carries `Content-Type: application/octet-stream`, an `Idempotency-Key` of 8-128 characters and an `X-File-Name` of 1-255 ASCII characters; `DELETE` carries its own `Idempotency-Key`; a 202 is never treated as a finished report; "Deleted" appears only after a `GET` that returns `deleted`.
7. Privacy: pick a file with a Russian name (`Выписка за октябрь.pdf`). A logger under observation receives neither the name nor any file bytes, no request carries the name, and the upload succeeds with the generated `serverFileName`.
8. Money and dates in both languages: the total is `151.99 AUD / month` in English and `151,99 AUD в месяц` in Russian, summed in minor units, and `lastSeen` dates format without a day shift.
9. Every edge case below marked "Test" or "Test + QA" gets a test; the "QA" part is checked by hand on both platforms.

| # | Edge case | Expected | Where |
|---|---|---|---|
| 1 | Double press on "Send" | One key, one POST | Test + QA |
| 2 | Relaunch during the upload | Only `GET` by key, `createRequests` does not grow | Test + QA |
| 3 | `lost_ack` with a repeat and with a relaunch | `newJobs = 1` | Test + QA |
| 4 | Mock stopped during the upload, the poll and the delete | Honest states; once the mock is back, everything continues on its own or by "Retry" | Test + QA |
| 5 | Mock reset while the phone holds an import | `gone_on_server`; a new job with the same number is never taken | Test + QA |
| 6 | `stale_status` | The screen never rolls back; the skipped answer is in the timeline | Test + QA |
| 7 | `delete_failure`, then `happy` | An honest "not deleted"; the retry with the same key reaches `deleted` | Test + QA |
| 8 | A late answer after a delete, a replacement or a cancel | Dropped | Test |
| 9 | A new statement while the old one fails to delete | The new one is not sent; an honest text | Test + QA |
| 10 | "Cancel upload" while the mock is stopped | Once the mock is back, the upload is deleted if it arrived | Test + QA |
| 11 | `spoofed.pdf`, `oversize.csv`, an empty file, a CSV with `\r\n` or a BOM | Rejected before the POST | Test + QA |
| 12 | Exactly 10 MiB and 10 MiB + 1 byte | The first is accepted, the second rejected | Test |
| 13 | A file name in Russian or with emoji | The name never reaches the server or the logs; the upload does not fail | Test + QA |
| 14 | The picker is cancelled, or the file cannot be read | A calm return, no error, no copies | Test + QA |
| 15 | The system erased our copy before the outcome is known | An honest text, no 409, no second job | Test |
| 16 | A 4xx answer to the upload | `failed` ("Error" on screen) with no endless repeats | Test |
| 17 | The app goes to the background during the upload and the poll | Everything continues after the return | Test + QA |
| 18 | The system language changes while the app runs | The texts switch | Test + QA |
| 19 | The largest font, the smallest screen, the dark theme, Reduce Motion | The main actions stay reachable, animations are off | QA |

## Deterministic Tests
- Unit tests never wait on real time: Jest fake timers for polling, recovery and backoff, injected `now()` and key generator.
- Integration tests never sleep for a fixed time: poll the controller state with a deadline (for example 5 s) until the expected phase.
- Every test owns its state: reset first, no dependence on test order, no variables shared between tests.
- Never commit `.only` or `.skip`. A flaky test is fixed, never retried.
