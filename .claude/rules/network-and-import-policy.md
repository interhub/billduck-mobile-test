---
paths:
  - "src/api/**"
  - "src/services/**"
  - "src/utils/errors/**"
  - "src/utils/files/**"
  - "src/utils/import/**"
  - "src/utils/promise/**"
  - "src/utils/json/**"
  - "src/stores/importStore.ts"
  - "src/types/**"
  - "src/constants/LIMITS.ts"
  - "src/constants/HTTP_STATUS.ts"
  - "src/constants/IMPORT_STATUS.ts"
  - "tests/integration/**"
---

# Network And Import Policy

## One Classifier
- `resolveErrorKind` (`src/utils/errors/resolveErrorKind.ts`) turns every failure into one `ERROR_KIND`; it is the only place that decides what a failure means.
  - `NETWORK`: no HTTP answer (refused, reset, dropped, offline). `TIMEOUT`: our own `AbortController` timer cancelled the request, or the server answered 408 or 504.
  - `SERVER`: a 5xx, a 429 (throttling passes after a pause), or a 2xx whose body fails its guard. `VALIDATION`: any other 4xx, refused the same way on every attempt.
  - `UNKNOWN`: a failure of a shape nobody recognises, or a status below 400 the call did not expect; never proof that a request did not arrive.
- Classify where the failure happens (our timer knows it fired, a response knows its status: `resolveHttpStatusErrorKind`) and return the kind in the result. Matching words in an error message is the last resort.
- API functions never throw: they return `{success: true, payload}` or `{success: false, error: {kind, httpStatus}}` and pass every JSON body through a typed guard first (`parseJson` and `isRecord` from `src/utils/json/parseJson.ts`, then a guard such as `readImportJob`). A failure is built with `failure` or `failureForStatus` (`src/api/apiResult.ts`).
- The base URL comes only from `ENV.API_BASE_URL` (`src/config/env.ts`).

## Timeouts And Limits
- Every number is a named constant in `src/constants/LIMITS.ts`: `MAX_FILE_SIZE_BYTES` (`10 * 1024 * 1024`), `FORMAT_HEADER_BYTES` (24), `UPLOAD_TIMEOUT_MS` (30 s), `REQUEST_TIMEOUT_MS` (10 s: by-key, job status, delete, `/__test/*`), `RECOVERY_DELAYS_MS` (1, 2 and 4 s), `POLL_INTERVAL_MS` (500), `POLL_MAX_BACKOFF_MS` (4000), `POLL_BACKOFF_FACTOR` (2), `POLL_FAILURES_BEFORE_RECONNECTING` (2), `SERVER_SILENCE_LIMIT_MS` (30 s), `CLEANUP_RECHECK_DELAY_MS` (5 s), `CLEANUP_POLL_ATTEMPTS` (20), `TIMELINE_MAX_ENTRIES` (200). Byte units come from `src/constants/BYTE_UNITS.ts`.
- Every request gets its timeout through an `AbortController`: JSON requests pass its `signal` to `fetch`, the upload passes it to `createUploadTask`.
- A timeout never means "not done": on a POST or a DELETE it means the outcome is unknown.

## What May Be Repeated

| Call | Automatic repeat | Rule |
|---|---|---|
| `POST /imports` | Only inside the recovery | After a by-key 404 in `reconnecting`, with the same key and the same bytes from our copy. After a relaunch never on its own: the person resends with "Send again" in `not_received` |
| `GET /imports/by-key/{key}` | Yes | Up to 3 recovery attempts after 1, 2 and 4 s; once on its own after a relaunch; the key check before a stored job is resumed, before a status read outside polling and before a DELETE; the `PendingCleanup` checks. A 404 means "not found at this instant", not a failure |
| `GET /imports/{jobId}` | Yes, as polling | Every 500 ms while `queued`, `processing` or `deleting`; after a failed read that is not a refusal, the pause doubles (`POLL_BACKOFF_FACTOR`) up to 4 s and resets after an answer. After `ready`, once more on return to the foreground, on opening `IMPORT_RESULT` and on pull to refresh |
| `DELETE /imports/{jobId}` | Never on a timer | The import: sent again only by "Retry", with the same `deleteKey`. A `PendingCleanup` entry: sent again with its own `deleteKey` each time the server answers again |
| `/__test/*` | Never | Diagnostics screen and tests only |

- Waits and repeat ladders live in `src/utils/promise/`; never write a repeat loop by hand, never put a retry inside the HTTP wrapper (it cannot tell a read from a write).
- Polls are sequential: the next read is scheduled after the previous one settles, never two in flight.
- A failed poll never ends the operation on its own: after 2 failed reads in a row the timeline shows "Reconnecting…", and after 30 s without any answer the phase becomes `server_unavailable` with "Retry", which resumes the poll.
- A 404 on a poll is `gone_on_server` (Revision Guard And Binding). Any other refusal (`VALIDATION`: a 4xx other than 408 and 429) stops the poll: `failed`, or `delete_failed` while deleting.
- Polling stops while the app is not active (`appStateStore`) and reads once, at once, when it returns.

## The Operation
- One active operation at a time, owned by `src/services/importController/` and stored by its repository; screens only read `importStore`, the controller's mirror of the operation (from `uploading` on, a mirror of what the repository has already stored).
- Every phase change of the stored operation goes through the pure reducer `src/utils/import/importReducer.ts` (no React, no network); nothing assigns its `phase` by hand. The reducer and the revision guard get their tests first. The phases before sending (`validating`, `rejected`, `confirming`, `replacing_previous`) belong to the draft in `importStore`, which lives in memory only.
- Once a deletion was asked for (`deleteKey` is stored), an answer moves the operation only to `deleting` or `deleted`; a job the server still keeps gives `delete_failed`, so the report never comes back after a restart or a silent server.
- Controller actions never reject: every failure is logged and becomes a phase, a timeline row, a dropped draft or a step that stops on purpose, so screens may start them with `void` (`custom-hooks.md`).
- The repository never throws either: `load` and `save` return an `ApiResult`. A write that fails is logged under the type of the step that needed it and stops that step, and the store mirrors only what reached the disk. When the operation of "Send" cannot be stored, nothing is sent and the draft goes with its copy.
- The phases are the `ImportPhase` union of `src/types/importOperation.ts`: `validating`, `rejected`, `confirming`, `replacing_previous`, `uploading`, `reconnecting`, `server_unavailable`, `not_received`, `queued`, `processing`, `ready`, `failed`, `deleting`, `delete_failed`, `deleted`, `gone_on_server`. The stored records, as they are written there:

```ts
export type ImportOperation = {
  /** Local id, also the name of the private file copy. */
  operationId: string;
  /** Created once and stored before the first POST. */
  idempotencyKey: string;
  /** Created and stored before the first DELETE, then reused by every retry. */
  deleteKey: string | null;
  phase: ImportPhase;
  jobId: string | null;
  /** The last revision accepted from the server. */
  revision: number;
  /** The status that came with that revision, to return to it after the server was silent. */
  serverStatus: IMPORT_STATUS | null;
  failure: ImportFailure | null;
  file: StatementFile;
  /** Generated ASCII name for X-File-Name, e.g. statement-20261029-1432.pdf. */
  serverFileName: string;
  createdAt: string;
  updatedAt: string;
};

/** An upload cancelled before its outcome was known: deleted on the server if it got there. */
export type PendingCleanup = {
  idempotencyKey: string;
  jobId: string | null;
  deleteKey: string | null;
};
```

- The pre-send phases (`validating`, `rejected`, `confirming`, `replacing_previous`) live only in memory. From `uploading` on, the repository stores exactly two things: the `ImportOperation` and the `PendingCleanup` list. The original file name and the found payments are never stored: after a relaunch the payments are read from the server again.
- A new statement can be added only when no operation is stored, or the stored one is `ready` or `failed`. While an operation is in progress or waits for a decision, "Add statement" is disabled and the caption under it says "Finish or cancel the current upload first".

## Sending
1. Create `idempotencyKey` once, with `randomUUID()` of `expo-crypto` (the controller's `createUuid`), when the file check passes and the draft becomes `confirming`, before `IMPORT_CONFIRM` shows it; never on a press. "Send" locks after the first press: a double press gives one key and one request.
2. If a previous statement exists (`ready`, or `failed` with a `jobId`), move to `replacing_previous` and delete it first (Deleting) until a `GET` returns `deleted`. If that delete fails (503 or no answer), the new file is not sent: the screen says "The old statement was not deleted from the server, the new one was not sent" and offers "Retry".
3. Write the operation in `uploading` through the operation repository (`await AsyncStorage.setItem`) and wait for the write. Only then send; when the write fails, nothing is sent and the file can be picked again.
4. Send the bytes from disk as a stream, never through JS memory, with the `File` method of the new `expo-file-system` API: `file.createUploadTask(url, {httpMethod: 'POST', uploadType: UploadType.BINARY_CONTENT, headers: {'Content-Type': 'application/octet-stream', 'Idempotency-Key': key, 'X-File-Name': serverFileName}, sessionType: 'foreground', signal})`, cancelled by an `AbortController` after 30 s.
   - Never call the top-level `uploadAsync` and `createUploadTask` functions of the main entry: they are stubs that throw at runtime. The task from `file.createUploadTask` starts only through its own `uploadAsync()` method, called once.
   - Never import `expo-file-system/legacy`. Never send the file through `fetch` or `expo/fetch` (in SDK 57 the global `fetch` is `expo/fetch`): both read the whole file into memory. Never call `response.blob()`: it throws on RN 0.86.
   - `sessionType: 'foreground'` is mandatory: an iOS background session survives a relaunch unpredictably.
   - The task resolves for every HTTP answer, 4xx and 5xx included; it rejects only without an answer, on a cancel, or when the file cannot be read.
5. 202 is the only success: move to `queued`, store `jobId` and revision 1, delete our copy, start polling. A 202 is never shown as a finished report.
6. A refusal the server would repeat (`VALIDATION`: a 4xx other than 408 and 429) is definite: `failed` with a clear text and no repeats. A file that passed the checks on the phone should never get one, so it is a bug, and the diagnostics screen shows it.
7. Everything else (no answer, dropped connection, timeout, 408, 429, 5xx, unreadable body, `UNKNOWN`) moves to `reconnecting`, keeps our copy and starts the recovery. An `uploading` operation found after a relaunch is an unknown outcome too.

## Recovering After A Lost Answer
- Up to 3 attempts after pauses of 1, 2 and 4 s (`RECOVERY_DELAYS_MS`). Each attempt reads `GET /imports/by-key/{key}`:
  - 200: take `jobId`, status and revision, delete our copy, poll.
  - 404: `POST` again with the SAME key and the same bytes from our copy. The server returns the same job, or creates it if the first request never arrived.
- The person sees only "Reconnecting…", with no choice and no buttons. The timeline shows "Answer to the upload lost", then "Upload found by key".
- When every attempt fails (the server does not answer): `server_unavailable` with its illustration, the text "Server unavailable", the main button "Retry" (runs the same recovery again) and the quiet "Cancel upload".
- After a relaunch, an operation in `uploading` or `reconnecting` only reads by key on its own and never sends the file again without the person:
  - 200: continue with the found job;
  - 404: `not_received` ("The file didn't reach the server"), with "Send again" (the same key and the same bytes) and the quiet "Cancel upload";
  - no answer: `server_unavailable`.
- Never create a new key and never re-pick the file for a resend: new bytes under the old key get a 409, a new key creates a second job.
- If the system erased our copy while the outcome is still unknown, the screen says "The file is no longer on this phone, pick it again". The old key is never reused with other bytes (that is a 409); the old upload goes to `PendingCleanup`.
- In `lost_ack`, `/__test/state` shows `newJobs = 1` after any number of repeats and relaunches.

## Cancel With Cleanup
- "Cancel upload" deletes our copy at once and moves the upload into `PendingCleanup`; the cancelled operation stops there.
- Whenever the server answers again (app launch, return to the foreground, "Retry" on `HOME`), every entry is checked by key. If the job exists, it is deleted with the entry's own `deleteKey` (created and stored before its first DELETE) until a `GET` returns `deleted`, at most `CLEANUP_POLL_ATTEMPTS` reads per pass; an entry still not deleted waits for the next pass. On a 404 there is one more check after `CLEANUP_RECHECK_DELAY_MS`, and then the entry is removed.
- A request for a pass while one runs is not lost: the running pass goes over the list again (`createCoalescedRunner`).
- Until the cleanup finishes, `HOME` shows the honest line "Upload cancelled. We'll delete the file from the server if it got there."

## Polling And The Response Timeline
- `GET /imports/{jobId}` runs by the table above while `queued`, `processing` or `deleting`.
- After `ready` the status is read once more on return to the foreground, on opening `IMPORT_RESULT` and on pull to refresh, so `stale_status` shows live.
- `ResponseTimeline` on `IMPORT_STATUS` gets a row for every server answer: status, revision, time. A skipped answer stays visible, marked "Stale, skipped"; repeats and dropped connections are rows too, and an answer equal to the previous row folds into it with a repeat count. The diagnostics screen shows the same events and the count of skipped answers. The timeline lives in memory only and keeps the last `TIMELINE_MAX_ENTRIES` rows.
- After a relaunch a stored job is resumed by its stored `jobId` without sending anything again, once the key check below passes: `queued` and `processing` keep polling, `ready` reads its payments again, and `deleting` reads the job first (`deleting` or `deleted` keep polling, anything else is `delete_failed`).

## Revision Guard And Binding
- Apply a server state only when its revision is greater than the stored one. The one exception: `ready` with the same revision is accepted when the phone holds no payments (after a relaunch). `processing` r2 after `ready` r3 is ignored and goes into the timeline as skipped.
- A late answer never revives a deleted job: `deleting` r4 and `deleted` r5 outrank every earlier state.
- Every request is bound to the operation it was sent for by a run token (`operationId` and the controller's generation, `src/utils/import/runToken.ts`). An answer for an operation that was deleted, replaced or cancelled is dropped, never applied.
- A 404 on `GET /imports/{jobId}` (for example after a mock reset) is `gone_on_server`: the screen says "The server no longer knows this statement" and the local operation is cleared. It is never "Deleted".
- Check the key first when a stored job is resumed after a relaunch, before a status read outside polling (pull to refresh, opening the result, "Retry") and before every DELETE: `GET /imports/by-key/{key}` must return the same `jobId`; a 404 or another `jobId` is `gone_on_server`. After `POST /__test/reset` the numbering restarts at `job-demo-001`, so a stored `jobId` may point at someone else's new job.

## Deleting
1. Create `deleteKey`, store it with `await`, move to `deleting`. Every retry reuses the stored key.
2. After the key check (no answer to it is `delete_failed`), `DELETE /imports/{jobId}` with `Idempotency-Key: deleteKey`:
   - 202: poll until `deleted`. Show "Deleted" only after a `GET` returns `deleted`.
   - 503 or any other error answer: `delete_failed`; the screen says the data on the server is NOT deleted, and "Retry" sends the DELETE again with the same `deleteKey`.
   - No answer: read the job by `jobId`; `deleting` or `deleted` keep polling, anything else is `delete_failed`.
   - 404: `gone_on_server`, never "Deleted".
3. While `queued` or `processing`, `IMPORT_STATUS` has a quiet "Cancel" that starts this same deletion.
4. After `deleted`, clear the stored operation and every temp file.

## Temp Copies
- Only in our folder `Paths.cache/imports/`, the file named by `operationId`, never by the original name.
- The picker leaves its copy in its own cache folder (`Paths.cache/DocumentPicker/`, as `node_modules/expo-document-picker` writes it): move the copy into `imports/` and delete the picker folder at once. On iOS the system may leave one more copy in `tmp/` (a `<bundle id>-Inbox` folder): delete it too.
- Delete our copy on a rejected check, on "Cancel" on `IMPORT_CONFIRM`, right after the server confirms the job (202 or found by key), on "Cancel upload", and after the import is deleted.
- Keep it until the server confirms the job: a resend needs the same bytes.
- On every launch, delete everything in `imports/` and in the picker folder that the active operation does not reference.

## File Checks Before Any Network
- Pick with `DocumentPicker.getDocumentAsync({type: ['application/pdf', 'text/*', 'application/vnd.ms-excel', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false})`. The type filter only hides photos and videos; it is not a check. If a kit fixture cannot be picked on a platform, fall back to `type: '*/*'`.
- On Android the picked file arrives as `content://`, and its temporary access ends with the activity; the cache copy gives us our own `file://` that survives a relaunch.
- Check the size before reading anything (the size the picker reported, then the size of our copy); above `MAX_FILE_SIZE_BYTES` reject with "This file is larger than 10 MB." and the real size. Never read the whole file into memory.
- Check the format by the first bytes only, never by extension or MIME type: `file.open(FileMode.ReadOnly)`, `readBytes(LIMITS.FORMAT_HEADER_BYTES)`, `close()` in `finally`. The name and the type only choose the wording of a refusal.
  - PDF: the first 5 bytes are `%PDF-`.
  - CSV: the first 24 bytes, with `\r` removed, start with `date,description,amount\n`, exactly as the server checks; a CSV with `\r\n` line ends or a BOM is rejected.
  - Anything else, and an empty file, is rejected: "This file isn't a real PDF." when it poses as a PDF, otherwise "Unsupported file."; a copy that is gone or cannot be read is refused as unreadable.
- A rejected file never reaches the network: `createRequests` on the mock stays the same.
- The original name stays in memory for `IMPORT_CONFIRM` only. The operation stores `serverFileName` for `X-File-Name` (`statement-20261029-1432.pdf`: Latin letters, digits, hyphen and dot only). The on-screen title ("Statement · 29 Oct, 14:32 · PDF · 2.4 KB" / "Выписка · 29 окт, 14:32 · PDF · 2,4 КБ") is never stored: it is built at render time from `createdAt`, `file.format` and `file.sizeBytes` in the current language, so it follows a system language change.
