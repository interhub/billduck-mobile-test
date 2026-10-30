export enum LANGUAGE {
  EN = 'en',
  RU = 'ru'
}

/** Russian picks one of three word forms by the last digits of the number. */
const pickRussianForm = (count: number, one: string, few: string, many: string): string => {
  const lastTwoDigits = Math.abs(count) % 100;
  const lastDigit = lastTwoDigits % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
};

const pickEnglishForm = (count: number, one: string, many: string): string => {
  if (count === 1) {
    return one;
  }
  return many;
};

const EN = {
  common: {
    appName: 'BillDuck',
    slogan: 'Where does my money go?',
    back: 'Back',
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
      too_large: 'This file is larger than 10 MB.',
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
    serverAnswer: (status: string) => `Server answer: ${status}`,
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

export type Translation = typeof EN;

const RU: Translation = {
  common: {
    appName: 'BillDuck',
    slogan: 'Куда уходят мои деньги?',
    back: 'Назад',
    retry: 'Повторить',
    cancel: 'Отмена'
  },
  format: {
    decimalSeparator: ',',
    groupSeparator: ' ',
    bytes: 'Б',
    kilobytes: 'КБ',
    megabytes: 'МБ',
    months: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    statementWord: 'Выписка',
    perMonth: (amount: string) => `${amount} в месяц`,
    exactBytes: (bytes: string) => `${bytes} байт`
  },
  phase: {
    uploading: 'Отправляем',
    queued: 'В очереди',
    processing: 'Обрабатывается',
    ready: 'Готово',
    reconnecting: 'Переподключаемся…',
    not_received: 'Не дошёл',
    server_unavailable: 'Сервер недоступен',
    failed: 'Ошибка',
    replacing_previous: 'Заменяем',
    deleting: 'Удаляем',
    delete_failed: 'Не удалено',
    deleted: 'Удалено',
    gone_on_server: 'Нет на сервере'
  },
  home: {
    empty: 'Выписок пока нет. Добавьте PDF или CSV, и уточка найдёт повторяющиеся платежи.',
    addStatement: 'Добавить выписку',
    addStatementBlocked: 'Сначала завершите или отмените текущую загрузку',
    currentStatement: 'Текущая выписка',
    repeatingPayments: (count: number) =>
      `${count} ${pickRussianForm(count, 'повторяющийся платёж', 'повторяющихся платежа', 'повторяющихся платежей')}`,
    cleanupPending: 'Загрузка отменена. Удалим файл с сервера, если он успел дойти.',
    outcomeDeleted: 'Выписка удалена. Сервер это подтвердил.',
    outcomeGone: 'Сервер больше не знает об этой выписке. На телефоне от неё ничего не осталось.',
    outcomeCancelled: 'Отменённая загрузка проверена: на сервере от неё ничего не осталось.',
    diagnostics: 'Диагностика'
  },
  importConfirm: {
    title: 'Проверьте файл',
    checking: 'Проверяем файл…',
    fileLabel: 'Файл',
    sizeLabel: 'Размер',
    formatLabel: 'Формат',
    titleLabel: 'В приложении будет называться',
    nameNote: 'Имя файла остаётся на телефоне. Сервер получит сгенерированное имя.',
    replaceNote: 'Текущая выписка будет удалена с сервера перед отправкой новой.',
    send: 'Отправить',
    rejectedTitle: 'Не подходит',
    nothingSent: 'На сервер ничего не отправлено.',
    rejection: {
      fake_pdf: 'Это не настоящий PDF.',
      too_large: 'Файл больше 10 МБ.',
      empty: 'Файл пустой.',
      unsupported: 'Неподдерживаемый файл.',
      unreadable: 'Файл не читается.'
    },
    sizeAgainstLimit: (size: string, limit: string) => `Его размер ${size}, предел ${limit}.`,
    expectedFiles: 'Выберите банковскую выписку в PDF или CSV.',
    chooseAnother: 'Выбрать другой файл'
  },
  importStatus: {
    title: 'Импорт',
    explanation: {
      uploading: 'Отправляем файл на сервер.',
      queued: 'Сервер принял файл. Он ждёт в очереди.',
      processing: 'Сервер читает выписку.',
      ready: 'Сервер закончил. Отчёт готов.',
      reconnectingUpload: 'Ответ на отправку потерялся. Проверяем, дошёл ли файл до сервера.',
      reconnectingJob: 'Сервер не отвечает. Спрашиваем ещё раз.',
      serverUnavailableUpload: 'Сервер не отвечает. Файл в безопасности на телефоне.',
      serverUnavailableJob: 'Сервер не отвечает. Выписка остаётся на сервере в прежнем виде.',
      notReceived: 'Файл не дошёл до сервера. Он остался на телефоне, его можно отправить ещё раз.',
      failedRejected: 'Сервер отказался принять этот файл.',
      failedFileMissing: 'Файла больше нет на телефоне, выберите его заново.',
      replacingPrevious: 'Сначала удаляем прошлую выписку с сервера. Новая ждёт.',
      replaceBlocked: 'Старая выписка не удалена с сервера, новая не отправлена.',
      deleting: 'Удаляем… Сервер ещё не подтвердил.',
      deleteFailed: 'Не удалено. Сервер не подтвердил, данные пока на нём.',
      deleted: 'Удалено. Сервер подтвердил.',
      goneOnServer: 'Сервер больше не знает об этой выписке.'
    },
    serverAnswer: (status: string) => `Ответ сервера: ${status}`,
    sendAgain: 'Отправить ещё раз',
    cancelUpload: 'Отменить загрузку',
    cancelImport: 'Отменить',
    openReport: 'Открыть отчёт',
    pickAgain: 'Выбрать файл заново',
    toHome: 'На главный экран',
    timelineTitle: 'Ответы сервера',
    timelineEmpty: 'Ответов пока нет.'
  },
  timeline: {
    previousStatement: 'Прошлая выписка',
    attempt: (attempt: number) => `попытка ${attempt}`,
    repeats: (count: number) => `×${count}`,
    event: {
      upload_sent: 'Файл отправлен',
      upload_accepted: 'Загрузка принята',
      upload_answer_lost: 'Ответ на отправку потерян',
      upload_rejected: 'Загрузка отклонена',
      app_restarted: 'Приложение перезапущено, повторной отправки нет',
      key_lookup_found: 'Загрузка найдена по ключу',
      key_lookup_not_found: 'По ключу пока не найдено',
      resent_same_key: 'Отправлено ещё раз с тем же ключом',
      file_missing: 'Копии файла на телефоне больше нет',
      status_applied: 'Статус',
      status_unchanged: 'Без изменений',
      status_stale_skipped: 'Устарел, пропущен',
      status_rejected: 'Сервер отказал в статусе',
      no_answer: 'Нет ответа',
      reconnecting: 'Переподключаемся…',
      server_unavailable: 'Сервер недоступен',
      delete_sent: 'Удаление отправлено',
      delete_accepted: 'Удаление принято',
      delete_failed: 'Удаление не прошло',
      deleted: 'Удалено, сервер подтвердил',
      gone_on_server: 'Сервер не знает эту выписку',
      upload_cancelled: 'Загрузка отменена',
      cleanup_deleted: 'Отменённая загрузка удалена с сервера',
      cleanup_not_found: 'Отменённая загрузка не дошла до сервера',
      late_answer_dropped: 'Запоздавший ответ отброшен'
    }
  },
  importResult: {
    title: 'Каждый месяц',
    totalLabel: 'Всего в месяц',
    details: 'Подробнее',
    deleteImport: 'Удалить импорт',
    deleteQuestion: 'Удалить этот импорт?',
    deleteExplanation:
      'Выписка и отчёт будут удалены с сервера. «Удалено» появится только после подтверждения сервера.',
    deleteAction: 'Удалить',
    loadingPayments: 'Читаем платежи с сервера…',
    staleSkipped: 'Пришёл устаревший ответ сервера, он пропущен. Отчёт не изменился.',
    checkedAt: (time: string) => `Проверено на сервере в ${time}`,
    serverAnswers: 'Ответы сервера',
    lastCharge: (date: string) => `Последнее списание ${date}`,
    cadence: {
      monthly: 'Ежемесячно',
      weekly: 'Еженедельно',
      yearly: 'Ежегодно'
    },
    paymentLabel: (merchant: string, amount: string, cadence: string) =>
      `${merchant}, ${amount}, ${cadence}`
  },
  paymentDetails: {
    title: 'Платёж',
    amountLabel: 'Сумма',
    cadenceLabel: 'Повторяется',
    lastChargeLabel: 'Последнее списание',
    currencyLabel: 'Валюта',
    note: 'BillDuck показывает, что повторяется. Отменять подписки он не умеет.',
    missing: 'Этого платежа больше нет в отчёте.'
  },
  diagnostics: {
    title: 'Диагностика',
    serverSection: 'Тестовый сервер',
    addressLabel: 'Адрес',
    healthLabel: 'Доступность',
    healthOk: 'Отвечает',
    healthDown: 'Не отвечает',
    healthChecking: 'Проверяем…',
    serverDownHint: 'Запустите его командой npm run mock в папке проекта.',
    scenarioSection: 'Сценарий',
    scenario: {
      happy: 'Всё работает',
      lost_ack: 'Ответ на новую загрузку теряется',
      stale_status: 'После готовности приходит устаревший статус',
      delete_failure: 'Удаление отвечает 503'
    },
    countersSection: 'Счётчики сервера',
    counter: {
      createRequests: 'Запросов на загрузку',
      newJobs: 'Новых заданий',
      duplicateHits: 'Повторов той же загрузки',
      acceptedBytes: 'Принято байт',
      deleteRequests: 'Запросов на удаление'
    },
    jobsSection: 'Задания на сервере',
    noJobs: 'Заданий нет.',
    phoneSection: 'Этот телефон',
    phaseLabel: 'Фаза',
    jobLabel: 'Задание',
    revisionLabel: 'Ревизия',
    nothingStored: 'Импорт не сохранён.',
    noValue: '-',
    pendingCleanups: 'Отменённых загрузок на проверке',
    staleSkipped: 'Пропущено устаревших ответов',
    journalSection: 'Журнал событий',
    journalEmpty: 'В этом запуске событий пока нет.',
    refresh: 'Обновить',
    resetAll: 'Сбросить всё',
    resetQuestion: 'Сбросить всё?',
    resetExplanation: 'Состояние тестового сервера и импорт на этом телефоне будут стёрты.',
    resetAction: 'Сбросить'
  }
};

/** Every interface string in both languages, with the same keys. */
export const TRANSLATIONS: Record<LANGUAGE, Translation> = {
  [LANGUAGE.EN]: EN,
  [LANGUAGE.RU]: RU
};
