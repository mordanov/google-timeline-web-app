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
    alltimeStats: 'All-time Stats',
    timestampLabels: 'Timestamps',
    apply: 'Apply',
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
    alltime: {
      title: 'All-time Statistics',
      overview: 'Overview',
      totalDays: 'Days tracked',
      period: 'Period',
      longestStreak: 'Longest streak',
      days: 'days',
      longestDay: 'Longest day',
      mostActiveMonth: 'Most active month',
      totalTransitTime: 'Total time in motion',
      uniquePlaces: 'Unique places',
      transport: 'Distance by Transport',
      countries: 'Countries Visited',
      cities: 'Cities Visited',
      firstVisit: 'First visit',
      lastVisit: 'Last visit',
      visits: 'visits',
      noData: 'No data yet',
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
    alltimeStats: 'Вся статистика',
    timestampLabels: 'Метки времени',
    apply: 'Применить',
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
    alltime: {
      title: 'Вся статистика',
      overview: 'Общее',
      totalDays: 'Дней отслежено',
      period: 'Период',
      longestStreak: 'Макс. серия',
      days: 'дн.',
      longestDay: 'Самый активный день',
      mostActiveMonth: 'Самый активный месяц',
      totalTransitTime: 'Всего в движении',
      uniquePlaces: 'Уникальных мест',
      transport: 'Расстояние по транспорту',
      countries: 'Страны',
      cities: 'Города',
      firstVisit: 'Первый визит',
      lastVisit: 'Последний визит',
      visits: 'визитов',
      noData: 'Нет данных',
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

export function t(lang: Lang): typeof TRANSLATIONS[Lang] {
  return TRANSLATIONS[lang]
}
