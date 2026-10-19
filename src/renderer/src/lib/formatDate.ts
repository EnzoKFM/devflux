const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_PER_MONTH = 30
const MONTHS_PER_YEAR = 12

const shortRelativeTimeFormat = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' })
const longRelativeTimeFormat = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'long' })

export function formatRelativeDate(isoDate: string, nowTimestamp: number = Date.now()): string {
  const publishedTimestamp = Date.parse(isoDate)
  if (Number.isNaN(publishedTimestamp)) {
    return ''
  }

  const elapsedSeconds = Math.max(0, Math.round((nowTimestamp - publishedTimestamp) / 1000))
  if (elapsedSeconds < SECONDS_PER_MINUTE) {
    return "à l'instant"
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / SECONDS_PER_MINUTE)
  if (elapsedMinutes < MINUTES_PER_HOUR) {
    return shortRelativeTimeFormat.format(-elapsedMinutes, 'minute')
  }

  const elapsedHours = Math.floor(elapsedMinutes / MINUTES_PER_HOUR)
  if (elapsedHours < HOURS_PER_DAY) {
    return shortRelativeTimeFormat.format(-elapsedHours, 'hour')
  }

  const elapsedDays = Math.floor(elapsedHours / HOURS_PER_DAY)
  if (elapsedDays < DAYS_PER_MONTH) {
    return shortRelativeTimeFormat.format(-elapsedDays, 'day')
  }

  const elapsedMonths = Math.floor(elapsedDays / DAYS_PER_MONTH)
  if (elapsedMonths < MONTHS_PER_YEAR) {
    return longRelativeTimeFormat.format(-elapsedMonths, 'month')
  }

  return longRelativeTimeFormat.format(-Math.floor(elapsedMonths / MONTHS_PER_YEAR), 'year')
}

export function formatAbsoluteDate(isoDate: string): string {
  const timestamp = Date.parse(isoDate)
  if (Number.isNaN(timestamp)) {
    return ''
  }
  return new Date(timestamp).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}
