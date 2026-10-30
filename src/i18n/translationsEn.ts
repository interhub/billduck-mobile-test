import {BYTE_UNITS} from '@/src/constants/BYTE_UNITS';
import {LIMITS} from '@/src/constants/LIMITS';

const MAX_FILE_SIZE_MEGABYTES = LIMITS.MAX_FILE_SIZE_BYTES / BYTE_UNITS.MEGABYTE;

const pickEnglishForm = (count: number, one: string, many: string): string => {
  if (count === 1) {
    return one;
  }
  return many;
};

export const TRANSLATIONS_EN = {
  common: {
    appName: 'BillDuck',
    slogan: 'Where does my money go?',
    back: 'Back',
    labelValue: (label: string, value: string) => `${label}: ${value}`,
    retry: 'Retry',
    cancel: 'Cancel'
  },
  format: {
    decimalSeparator: '.',
    groupSeparator: ',',
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    statementWord: 'Statement',
    titleSeparator: ' · ',
    perMonth: (amount: string) => `${amount} / month`,
    exactBytes: (bytes: string) => `${bytes} bytes`
  },
  phase: {
    uploading: 'Sending',
    queued: 'Queued',
    processing: 'Processing',
    ready: 'Ready',
    reconnecting: 'Reconnecting…',
    not_received: 'Not received',
    server_unavailable: 'Server unavailable',
    failed: 'Error',
    replacing_previous: 'Replacing',
    deleting: 'Deleting',
    delete_failed: 'Not deleted',
    deleted: 'Deleted',
    gone_on_server: 'Not on the server'
  },
  home: {
    empty: 'No statements yet. Add a PDF or CSV and the duck will find payments that repeat.',
    addStatement: 'Add statement',
    addStatementBlocked: 'Finish or cancel the current upload first',
    currentStatement: 'Current statement',
    repeatingPayments: (count: number) =>
      `${count} ${pickEnglishForm(count, 'repeating payment', 'repeating payments')}`,
    cleanupPending: "Upload cancelled. We'll delete the file from the server if it got there.",
    outcomeDeleted: 'The statement is deleted. The server confirmed it.',
    outcomeGone:
      'The server no longer knows this statement. Nothing about it is left on this phone.',
    outcomeCancelled: 'The cancelled upload is checked: nothing of it is left on the server.',
    diagnostics: 'Diagnostics'
  },
  importConfirm: {
    title: 'Check the file',
    checking: 'Checking the file…',
    fileLabel: 'File',
    sizeLabel: 'Size',
    formatLabel: 'Format',
    titleLabel: 'Shown in the app as',
    nameNote: 'The file name stays on this phone. The server gets a generated name.',
    replaceNote:
      'The current statement will be deleted from the server before the new one is sent.',
    send: 'Send',
    rejectedTitle: 'Not accepted',
    nothingSent: 'Nothing was sent to the server.',
    rejection: {
      fake_pdf: "This file isn't a real PDF.",
      too_large: `This file is larger than ${MAX_FILE_SIZE_MEGABYTES} MB.`,
      empty: 'This file is empty.',
      unsupported: 'Unsupported file.',
      unreadable: "This file can't be read."
    },
    sizeAgainstLimit: (size: string, limit: string) =>
      `Its size is ${size}, the limit is ${limit}.`,
    expectedFiles: 'Choose a bank statement in PDF or CSV.',
    chooseAnother: 'Choose another file'
  },
  importStatus: {
    title: 'Import',
    explanation: {
      uploading: 'Sending the file to the server.',
      queued: 'The server accepted the file. It waits in the queue.',
      processing: 'The server is reading the statement.',
      ready: 'The server finished. The report is ready.',
      reconnectingUpload:
        'The answer to the upload got lost. Checking whether the file reached the server.',
      reconnectingJob: "The server doesn't answer. Asking again.",
      serverUnavailableUpload: "The server isn't responding. Your file is safe on this phone.",
      serverUnavailableJob:
        "The server isn't responding. The statement stays on the server as it was.",
      notReceived:
        "The file didn't reach the server. It is still on this phone and can be sent again.",
      failedRejected: 'The server refused this file.',
      failedFileMissing: 'The file is no longer on this phone, pick it again.',
      replacingPrevious:
        'Deleting the previous statement from the server first. The new one waits.',
      replaceBlocked:
        'The old statement was not deleted from the server, the new one was not sent.',
      deleting: "Deleting… The server hasn't confirmed it yet.",
      deleteFailed: "Not deleted. The server didn't confirm it, your data is still there.",
      deleted: 'Deleted. The server confirmed it.',
      goneOnServer: 'The server no longer knows this statement.'
    },
    serverAnswer: (httpStatus: number) => `Server answer: HTTP ${httpStatus}`,
    sendAgain: 'Send again',
    cancelUpload: 'Cancel upload',
    cancelImport: 'Cancel',
    openReport: 'Open report',
    pickAgain: 'Choose the file again',
    toHome: 'Back to the main screen',
    timelineTitle: 'Server answers',
    timelineEmpty: 'No answers yet.'
  },
  timeline: {
    previousStatement: 'Previous statement',
    revision: (revision: number) => `r${revision}`,
    httpStatus: (httpStatus: number) => `HTTP ${httpStatus}`,
    attempt: (attempt: number) => `attempt ${attempt}`,
    repeats: (count: number) => `×${count}`,
    event: {
      upload_sent: 'File sent',
      upload_accepted: 'Upload accepted',
      upload_answer_lost: 'Answer to the upload lost',
      upload_rejected: 'Upload refused',
      app_restarted: 'App restarted, nothing is sent again',
      key_lookup_found: 'Upload found by key',
      key_lookup_not_found: 'Not found by key yet',
      resent_same_key: 'Sent again with the same key',
      file_missing: 'The copy of the file on the phone is gone',
      status_applied: 'Status',
      status_unchanged: 'No change',
      status_stale_skipped: 'Stale, skipped',
      status_rejected: 'Status read refused',
      no_answer: 'No answer',
      reconnecting: 'Reconnecting…',
      server_unavailable: 'Server unavailable',
      delete_sent: 'Delete sent',
      delete_accepted: 'Delete accepted',
      delete_failed: 'Delete failed',
      deleted: 'Deleted, confirmed by the server',
      gone_on_server: 'Unknown to the server',
      upload_cancelled: 'Upload cancelled',
      cleanup_deleted: 'Cancelled upload deleted from the server',
      cleanup_not_found: 'Cancelled upload never reached the server',
      late_answer_dropped: 'Late answer dropped'
    }
  },
  importResult: {
    title: 'Every month',
    totalLabel: 'Total per month',
    details: 'Details',
    deleteImport: 'Delete import',
    deleteQuestion: 'Delete this import?',
    deleteExplanation:
      'The statement and its report will be deleted from the server. "Deleted" appears only after the server confirms it.',
    deleteAction: 'Delete',
    loadingPayments: 'Reading the payments from the server…',
    staleSkipped: 'An older server answer arrived and was skipped. The report stays as it is.',
    checkedAt: (time: string) => `Checked with the server at ${time}`,
    serverAnswers: 'Server answers',
    lastCharge: (date: string) => `Last charge ${date}`,
    cadence: {
      monthly: 'Monthly',
      weekly: 'Weekly',
      yearly: 'Yearly'
    },
    paymentLabel: (merchant: string, amount: string, cadence: string) =>
      `${merchant}, ${amount}, ${cadence}`
  },
  paymentDetails: {
    title: 'Payment',
    amountLabel: 'Amount',
    cadenceLabel: 'Repeats',
    lastChargeLabel: 'Last charge',
    currencyLabel: 'Currency',
    note: "BillDuck shows what repeats. It doesn't cancel subscriptions.",
    missing: 'This payment is no longer in the report.'
  },
  diagnostics: {
    title: 'Diagnostics',
    serverSection: 'Mock server',
    addressLabel: 'Address',
    healthLabel: 'Health',
    healthOk: 'Responding',
    healthDown: 'Not responding',
    healthChecking: 'Checking…',
    serverDownHint: 'Start it with npm run mock in the project folder.',
    scenarioSection: 'Scenario',
    scenario: {
      happy: 'Everything works',
      lost_ack: 'The answer to a new upload is lost',
      stale_status: 'An older status comes after ready',
      delete_failure: 'Delete answers 503'
    },
    countersSection: 'Server counters',
    counter: {
      createRequests: 'Upload requests',
      newJobs: 'New jobs',
      duplicateHits: 'Repeats of the same upload',
      acceptedBytes: 'Accepted bytes',
      deleteRequests: 'Delete requests'
    },
    jobsSection: 'Jobs on the server',
    noJobs: 'No jobs.',
    phoneSection: 'This phone',
    phaseLabel: 'Phase',
    jobLabel: 'Job',
    revisionLabel: 'Revision',
    nothingStored: 'No import is stored.',
    noValue: '-',
    pendingCleanups: 'Cancelled uploads to check',
    staleSkipped: 'Stale answers skipped',
    journalSection: 'Event journal',
    journalEmpty: 'No events in this launch yet.',
    refresh: 'Refresh',
    resetAll: 'Reset all',
    resetQuestion: 'Reset everything?',
    resetExplanation: 'The mock server state and the import on this phone will be erased.',
    resetAction: 'Reset'
  }
};

export type Translation = typeof TRANSLATIONS_EN;
