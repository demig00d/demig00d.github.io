/** @const {Object<string, Object<string, string>>} */
export const translations = {
  en: {
    // Months and Days
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    dayNamesShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    dayNamesFull: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],

    // Placeholders & Basic UI
    newTask: "New task...",
    newTaskSomeday: "New task for inbox...",
    searchPlaceholder: "Search tasks",
    noResults: "No matching tasks found.",
    close: "Close",
    baseTitleName: "Week planner",
    noTodayTasks: "No tasks for today",
    pickADate: "Pick a date",
    description: "Description",

    // Settings
    settings: "Settings",
    settingsTitle: "Settings",
    theme: "Theme",
    language: "Language",
    themeAuto: "Auto",
    themeLight: "Light",
    themeDark: "Dark",
    displayOptionsHeader: "Display",
    fullWeekdaysHeader: "Full weekday names",
    wrapWeekTitlesHeader: "Wrap task titles",
    data: "Data",
    exportDatabase: "Export Database",
    importDatabase: "Import Database",
    exportDatabaseTitle: "Export Database",
    importDatabaseTitle: "Import Database",

    // Calendar Navigation
    previousWeek: "Previous Week",
    nextWeek: "Next Week",

    // Task Actions & Details
    taskDate: "Task Date",
    deleteTask: "Delete Task",
    deleteTaskTitle: "Delete Task",
    markAsDone: "Mark as done",
    markAsUndone: "Mark as undone",
    recurringTask: "Recurring task",
    copyTaskLink: "Copy Task Link",
    resetColor: "Reset Color",
    toggleDescriptionMode: "Toggle Description Mode",
    colorBlue: "Blue",
    colorGreen: "Green",
    colorYellow: "Yellow",
    colorPink: "Pink",
    colorOrange: "Orange",
    viewRecurringChain: "View Recurring Chain",
    // Date Picker
    datePickerNavPrev: "Previous Month",
    datePickerNavNext: "Next Month",
    removeDate: "Remove Date",

    // Recurrence
    recurrence: "Recurrence",
    recurrenceNone: "None",
    recurrenceEvery: "Repeat every",
    recurrenceDays: "Days",
    recurrenceWeeks: "Weeks",
    recurrenceMonths: "Months",
    recurrenceYears: "Years",
    recurrenceNext: "Next:",
    recurrenceRemove: "Remove recurrence",
    recurringChainTitle: "Recurring Tasks",
    chainPageInfo: "Page {currentPage} of {totalPages}",

    // Snackbar Messages & Undo
    taskLinkCopied: "Task link copied",
    taskLinkCopyFailed: "Failed to copy task link",
    errorTaskNotFound: "Error: Task not found.",
    failedToSaveTitle: "Failed to save title.",
    taskDeleted: "Task deleted.",
    undo: "Undo",
    taskRestored: "Task restored.",
    failedToDeleteTask: "Failed to delete task.",
    failedToUpdateTaskStatus: "Failed to update task status.",
    errorLoadingTaskDetails: "Error loading task details.",
    failedToSaveColor: "Failed to save color.",
    failedToUpdateDate: "Failed to update task date.",
    failedToSaveRecurrence: "Failed to save recurrence settings.",
    recurrenceRemoved: "Recurrence removed.",
    recurrenceRestored: "Recurrence restored.",
    failedToRemoveRecurrence: "Failed to remove recurrence.",
    importingDatabase: "Importing database...",
    importSuccess: "Database imported successfully! Page will reload.",
    importError: "Import failed",
    errorImportFile: "Import Error: Please select a .db file.",
    errorImportNetwork: "Import failed: Network error or server unavailable.",
    errorMovingTask: "Error moving task.",
    failedToLoadChain: "Failed to load recurring tasks.",
  },
  ru: {
    // Months and Days
    monthNames: [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ],
    dayNamesShort: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    dayNamesFull: [
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
      "Воскресенье",
    ],

    // Placeholders & Basic UI
    newTask: "Новая задача...",
    newTaskSomeday: "Новая задача на когда-нибудь...",
    searchPlaceholder: "Поиск задач",
    noResults: "Задачи не найдены.",
    close: "Закрыть",
    baseTitleName: "Планировщик недели",
    noTodayTasks: "Нет задач на сегодня",
    pickADate: "Выбрать дату",
    description: "Описание",

    // Settings
    settings: "Настройки",
    settingsTitle: "Настройки",
    theme: "Тема",
    language: "Язык",
    themeAuto: "Авто",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    displayOptionsHeader: "Отображение",
    fullWeekdaysHeader: "Полные названия дней недели",
    wrapWeekTitlesHeader: "Не сокращать заголовки задач",
    data: "Данные",
    exportDatabase: "Экспорт базы данных",
    importDatabase: "Импорт базы данных",
    exportDatabaseTitle: "Экспорт базы данных",
    importDatabaseTitle: "Импорт базы данных",

    // Calendar Navigation
    previousWeek: "Предыдущая неделя",
    nextWeek: "Следующая неделя",

    // Task Actions & Details
    taskDate: "Дата задачи",
    deleteTask: "Удалить задачу",
    deleteTaskTitle: "Удалить задачу",
    markAsDone: "Отметить как сделанное",
    markAsUndone: "Отметить как не сделанное",
    recurringTask: "Повторяющаяся задача",
    copyTaskLink: "Копировать ссылку на задачу",
    resetColor: "Сбросить цвет",
    toggleDescriptionMode: "Переключить режим описания",
    colorBlue: "Синий",
    colorGreen: "Зеленый",
    colorYellow: "Желтый",
    colorPink: "Розовый",
    colorOrange: "Оранжевый",
    viewRecurringChain: "Показать цепочку повторов",

    // Date Picker
    datePickerNavPrev: "Предыдущий месяц",
    datePickerNavNext: "Следующий месяц",
    removeDate: "Убрать дату",

    // Recurrence
    recurrence: "Повторение",
    recurrenceNone: "Нет",
    recurrenceEvery: "Повторять каждые",
    recurrenceDays: "дн.",
    recurrenceWeeks: "нед.",
    recurrenceMonths: "мес.",
    recurrenceYears: "г./лет",
    recurrenceNext: "След.:",
    recurrenceRemove: "Убрать повторение",
    recurringChainTitle: "Повторяющиеся задачи",
    chainPageInfo: "Стр. {currentPage} из {totalPages}",

    // Snackbar Messages & Undo
    taskLinkCopied: "Ссылка на задачу скопирована",
    taskLinkCopyFailed: "Не удалось скопировать ссылку на задачу",
    errorTaskNotFound: "Ошибка: Задача не найдена.",
    failedToSaveTitle: "Не удалось сохранить заголовок.",
    taskDeleted: "Задача удалена.",
    undo: "Отменить",
    taskRestored: "Задача восстановлена.",
    failedToDeleteTask: "Не удалось удалить задачу.",
    failedToUpdateTaskStatus: "Не удалось обновить статус задачи.",
    errorLoadingTaskDetails: "Ошибка загрузки сведений о задаче.",
    failedToSaveColor: "Не удалось сохранить цвет.",
    failedToUpdateDate: "Не удалось обновить дату задачи.",
    failedToSaveRecurrence: "Не удалось сохранить настройки повторения.",
    recurrenceRemoved: "Повторение удалено.",
    recurrenceRestored: "Повторение восстановлено.",
    failedToRemoveRecurrence: "Не удалось удалить повторение.",
    importingDatabase: "Импорт базы данных...",
    importSuccess:
      "База данных успешно импортирована! Страница перезагрузится.",
    importError: "Ошибка импорта",
    errorImportFile: "Ошибка импорта: Пожалуйста, выберите файл .db.",
    errorImportNetwork: "Ошибка импорта: Сетевая ошибка или сервер недоступен.",
    errorMovingTask: "Ошибка перемещения задачи.",
    failedToLoadChain: "Не удалось загрузить повторяющиеся задачи.",
  },
};

/**
 * Loads the language preference from localStorage and updates translations.
 * @returns {string} The loaded language code.
 */
export function loadLanguage() {
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru"; // Default to Russian
  updateTranslations(lang);
  return lang;
}

/**
 * Updates UI text based on the selected language.
 * @param {string} lang - The language code.
 * @returns {Promise<void>}
 */
export async function updateTranslations(lang) {
  /** @const {Object<string, string>} */
  const trans = translations[lang];
  if (!trans) {
    console.error("Translations not found for language:", lang);
    return;
  }

  // Update text content or placeholder for elements with data-translate
  document.querySelectorAll("[data-translate]").forEach((element) => {
    /** @const {string} */
    const key = element.dataset.translate;
    if (trans[key]) {
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        if (element.placeholder !== undefined) element.placeholder = trans[key];
      } else if (element.tagName === "OPTION") {
        element.textContent = trans[key];
      } else if (
        !element.querySelector("i") ||
        element.tagName === "SPAN" ||
        element.tagName === "BUTTON"
      ) {
        // Only update text content if it's not a template placeholder
        if (!key.includes("{")) {
          element.textContent = trans[key];
        }
      }
    } else {
      // Don't warn for templated strings like chainPageInfo
      if (!key.includes("{")) {
        console.warn(
          `Translation key "${key}" not found for language "${lang}"`,
        );
      }
    }
  });

  // Update title attributes
  document
    .querySelectorAll("[data-translate-title], [data-translate]")
    .forEach((element) => {
      // Skip specific text spans inside checkboxes
      if (
        element.tagName === "SPAN" &&
        element.parentElement?.classList.contains("styled-checkbox")
      ) {
        return;
      }
      /** @const {string} */
      const titleKey =
        element.dataset.translateTitle || element.dataset.translate;
      if (titleKey && trans[titleKey]) {
        element.title = trans[titleKey];
      }
    });

  // Specific updates not covered by general data attributes
  /** @const {function(string, string): void} */
  const updateElementText = (selector, key) => {
    /** @const {HTMLElement | null} */
    const el = document.querySelector(selector);
    if (el && trans[key]) el.textContent = trans[key];
  };
  /** @const {function(string, string): void} */
  const updateElementTitle = (selector, key) => {
    /** @const {HTMLElement | null} */
    const el = document.querySelector(selector);
    if (el && trans[key]) el.title = trans[key];
  };

  // Header/Nav
  updateElementTitle("#settings-btn", "settingsTitle");
  updateElementTitle("#prev-week", "previousWeek");
  updateElementTitle("#next-week", "nextWeek");

  // Task Details
  updateElementTitle('.color-swatch[data-color="no-color"]', "resetColor");
  updateElementTitle(".color-swatch.blue-swatch", "colorBlue");
  updateElementTitle(".color-swatch.green-swatch", "colorGreen");
  updateElementTitle(".color-swatch.yellow-swatch", "colorYellow");
  updateElementTitle(".color-swatch.pink-swatch", "colorPink");
  updateElementTitle(".color-swatch.orange-swatch", "colorOrange");
  updateElementTitle("#copy-task-link-btn", "copyTaskLink");
  updateElementTitle("#recurring-task-details", "recurringTask");
  updateElementTitle("#view-recurring-chain-btn", "viewRecurringChain");
  updateElementTitle("#delete-task-details", "deleteTaskTitle");
  updateElementTitle("#close-task-details-popup", "close");
  updateElementTitle("#toggle-description-mode-btn", "toggleDescriptionMode");

  /** @const {HTMLElement | null} */
  const dateInputElement = document.getElementById("task-details-date");
  if (dateInputElement) {
    if (!dateInputElement.dataset.selectedDate) {
      dateInputElement.textContent = trans.pickADate || "Pick a date";
    }
    dateInputElement.title = trans.pickADate || "Pick a date";
  }

  /** @const {HTMLElement | null} */
  const markDoneBtn = document.getElementById("mark-done-task-details");
  if (markDoneBtn && trans.markAsDone && trans.markAsUndone) {
    /** @const {boolean} */
    const isDone = markDoneBtn.dataset.completed === "1";
    markDoneBtn.title = isDone ? trans.markAsUndone : trans.markAsDone;
  }

  // Description Label Text Node (Specific handling for the colon)
  /** @const {HTMLLabelElement | null} */
  const descriptionLabel = document.querySelector(
    'label[for="task-description-textarea"]',
  );
  if (descriptionLabel && trans.description) {
    let textNode = descriptionLabel.firstChild;
    while (textNode) {
      if (
        textNode.nodeType === Node.TEXT_NODE &&
        textNode.textContent.includes(":")
      ) {
        textNode.textContent = trans.description + ": ";
        break;
      }
      textNode = textNode.nextSibling;
    }
  }

  // Recurrence Controls
  updateElementText(
    '#recurrence-controls label[data-translate="recurrenceEvery"]',
    "recurrenceEvery",
  );

  // Date Picker
  updateElementTitle("#date-picker-prev-month", "datePickerNavPrev");
  updateElementTitle("#date-picker-next-month", "datePickerNavNext");
  updateElementText("#date-picker-reset-date", "removeDate");
  updateElementTitle("#date-picker-reset-date", "removeDate");

  // Chain Popup
  updateElementTitle("#close-recurring-chain-popup", "close");
  updateElementTitle("#recurring-chain-prev-page", "previousWeek");
  updateElementTitle("#recurring-chain-next-page", "nextWeek");
}

/**
 * Sets the language, updates local storage, and refreshes UI translations.
 * @param {string} lang - The new language code.
 * @returns {Promise<void>}
 */
export async function setLanguage(lang) {
  localStorage.setItem("language", lang);
  await updateTranslations(lang);
}
