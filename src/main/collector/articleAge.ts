import { ARTICLE_MAX_AGE_IN_DAYS } from '@shared/contract'
import { MILLISECONDS_PER_DAY } from '@shared/time'

export function computeOldestAllowedPublicationDate(now: Date): string {
  return new Date(now.getTime() - ARTICLE_MAX_AGE_IN_DAYS * MILLISECONDS_PER_DAY).toISOString()
}
