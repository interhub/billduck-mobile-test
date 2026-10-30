import {Translation} from '@/src/i18n/translationsEn';

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

export const TRANSLATIONS_RU: Translation = {
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
    serverAnswer: (httpStatus: number) => `Ответ сервера: HTTP ${httpStatus}`,
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
    revision: (revision: number) => `r${revision}`,
    httpStatus: (httpStatus: number) => `HTTP ${httpStatus}`,
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
