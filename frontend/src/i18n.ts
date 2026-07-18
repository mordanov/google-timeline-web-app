export type Lang = 'ru' | 'en'

export const TRANSLATIONS = {
  en: {
    appTitle: 'Timeline Viewer',
    singleDay: 'Single day',
    dateRange: 'Date range',
    from: 'From',
    to: 'to',
    activitySummary: 'Activity Summary',
    noActivityData: 'No activity data',
    noData: 'No data for this date',
    loading: 'Loading…',
    upload: 'Upload Timeline File',
    hideUpload: 'Hide Upload',
    importHistory: 'Import History',
    timestampLabels: 'Timestamps',
    lastSync: 'Last sync',
    maxTrackingDate: 'Latest tracking',
    never: 'never',
    modes: {
      driving: 'Driving',
      transit: 'Transit',
      walking: 'Walking',
      running: 'Running',
      cycling: 'Cycling',
      flying: 'Flying',
      other: 'Other',
    },
  },
  ru: {
    appTitle: 'Timeline Viewer',
    singleDay: 'День',
    dateRange: 'Диапазон',
    from: 'С',
    to: 'по',
    activitySummary: 'Активность',
    noActivityData: 'Нет данных',
    noData: 'Нет данных за эту дату',
    loading: 'Загрузка…',
    upload: 'Загрузить файл Timeline',
    hideUpload: 'Скрыть загрузку',
    importHistory: 'История импорта',
    timestampLabels: 'Метки времени',
    lastSync: 'Последняя синхронизация',
    maxTrackingDate: 'Последняя запись',
    never: 'никогда',
    modes: {
      driving: 'Авто',
      transit: 'Транспорт',
      walking: 'Пешком',
      running: 'Бег',
      cycling: 'Велосипед',
      flying: 'Самолёт',
      other: 'Другое',
    },
  },
} as const

export function getLang(): Lang {
  const stored = localStorage.getItem('lang')
  if (stored === 'ru' || stored === 'en') return stored
  return 'ru'
}

export function setLang(lang: Lang) {
  localStorage.setItem('lang', lang)
}

export function t(lang: Lang): typeof TRANSLATIONS['en'] {
  return TRANSLATIONS[lang]
}
