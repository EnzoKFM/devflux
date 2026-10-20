import type { FeedbackReason, SourceCategory, ThemePreference, TopicPreference } from '@shared/contract'

export interface FeedbackReasonChoice {
  reason: FeedbackReason | null
  label: string
}

export const FEEDBACK_REASON_CHOICES: FeedbackReasonChoice[] = [
  { reason: 'off-topic', label: 'Hors sujet' },
  { reason: 'too-basic', label: 'Trop basique' },
  { reason: 'already-seen', label: 'Déjà vu' },
  { reason: 'bad-source', label: 'Source pas intéressante' },
  { reason: null, label: 'Sans raison' }
]

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  web: 'Web',
  software: 'Logiciel',
  general: 'Général'
}

export const SOURCE_CATEGORIES = Object.keys(SOURCE_CATEGORY_LABELS) as SourceCategory[]

export type ViewId = 'today' | 'read-later' | 'favorites' | 'profile' | 'sources' | 'settings'

export interface NavigationItem {
  viewId: ViewId
  label: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { viewId: 'today', label: 'Aujourd’hui' },
  { viewId: 'read-later', label: 'Plus tard' },
  { viewId: 'favorites', label: 'Favoris' },
  { viewId: 'profile', label: 'Mon profil' },
  { viewId: 'sources', label: 'Sources' },
  { viewId: 'settings', label: 'Réglages' }
]

export const EXPLORATION_BADGE_LABEL = 'Découverte'

export const EXPLORATION_BADGE_DESCRIPTION = 'Article proposé hors de vos habitudes pour élargir votre veille'

export interface TopicPreferenceChoice {
  preference: TopicPreference
  label: string
}

export const TOPIC_PREFERENCE_CHOICES: TopicPreferenceChoice[] = [
  { preference: 'followed', label: 'Suivi' },
  { preference: 'neutral', label: 'Neutre' },
  { preference: 'muted', label: 'Masqué' }
]

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre'
}
