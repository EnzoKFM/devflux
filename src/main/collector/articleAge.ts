import { ARTICLE_MAX_AGE_IN_DAYS } from '@shared/contract'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export function computeOldestAllowedPublicationDate(now: Date): string {
  return new Date(now.getTime() - ARTICLE_MAX_AGE_IN_DAYS * MILLISECONDS_PER_DAY).toISOString()
}
