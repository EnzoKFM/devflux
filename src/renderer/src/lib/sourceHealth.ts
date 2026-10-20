import { SOURCE_HEALTH_WINDOW_IN_DAYS, type Source } from '@shared/contract'
import { MILLISECONDS_PER_DAY } from '@shared/time'
import { formatAbsoluteDate } from './formatDate'
import { pluralize } from './pluralize'

export type SourceHealthStatus = 'disabled' | 'failing' | 'silent' | 'pending' | 'healthy'

export interface SourceHealth {
  status: SourceHealthStatus
  label: string
}

function isOlderThanHealthWindow(source: Source, now: Date): boolean {
  const createdTimestamp = Date.parse(source.createdAt)
  if (Number.isNaN(createdTimestamp)) {
    return false
  }
  return now.getTime() - createdTimestamp >= SOURCE_HEALTH_WINDOW_IN_DAYS * MILLISECONDS_PER_DAY
}

function describeLastSuccess(source: Source): string {
  return source.lastSucceededAt
    ? `dernière collecte réussie le ${formatAbsoluteDate(source.lastSucceededAt)}`
    : 'jamais collectée avec succès'
}

function describeCollectionActivity(source: Source): string {
  if (!source.lastSucceededAt) {
    return describeLastSuccess(source)
  }
  const retainedArticles = pluralize(source.recentArticleCount, 'article retenu', 'articles retenus')
  return `${retainedArticles} sur ${SOURCE_HEALTH_WINDOW_IN_DAYS} jours · ${describeLastSuccess(source)}`
}

export function describeSourceHealth(source: Source, status: SourceHealthStatus): string {
  switch (status) {
    case 'disabled':
      return 'Source désactivée'
    case 'failing':
      return `En erreur : ${source.lastError} · ${describeCollectionActivity(source)}`
    case 'silent':
      return `Aucun article depuis ${SOURCE_HEALTH_WINDOW_IN_DAYS} jours · ${describeLastSuccess(source)}`
    case 'pending':
      return 'Jamais collectée avec succès'
    case 'healthy':
      return describeCollectionActivity(source)
  }
}

function resolveSourceHealthStatus(source: Source, now: Date): SourceHealthStatus {
  if (!source.isEnabled) {
    return 'disabled'
  }
  if (source.lastError !== null) {
    return 'failing'
  }
  if (source.recentArticleCount === 0 && isOlderThanHealthWindow(source, now)) {
    return 'silent'
  }
  if (!source.lastSucceededAt) {
    return 'pending'
  }
  return 'healthy'
}

export function resolveSourceHealth(source: Source, now: Date): SourceHealth {
  const status = resolveSourceHealthStatus(source, now)
  return { status, label: describeSourceHealth(source, status) }
}
