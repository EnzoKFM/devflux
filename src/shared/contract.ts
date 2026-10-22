export const ARTICLE_MAX_AGE_IN_DAYS = 14
export const DAILY_DIGEST_SIZE = 20
export const SOURCE_HEALTH_WINDOW_IN_DAYS = 7
export const SEARCH_QUERY_MAX_LENGTH = 200

export type FeedbackRating = 'like' | 'dislike'

export const FEEDBACK_REASONS = [
  'off-topic',
  'not-interesting',
  'too-basic',
  'too-advanced',
  'not-french',
  'promotional',
  'clickbait',
  'already-seen',
  'bad-source'
] as const

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export type SourceCategory = 'web' | 'software' | 'general'

export type RecommendationSignal =
  | 'similar-content'
  | 'avoids-dislikes'
  | 'liked-source'
  | 'freshness'
  | 'exploration'
  | 'recency'

export interface RecommendationReason {
  mode: RecommendationMode | null
  closestTopicLabel: string | null
  dominantSignal: RecommendationSignal
}

export interface DigestArticle {
  id: number
  title: string
  url: string
  summary: string | null
  sourceName: string
  publishedAt: string
  isRead: boolean
  isFavorite: boolean
  isReadLater: boolean
  rating: FeedbackRating | null
  feedbackReason: FeedbackReason | null
  isExploration: boolean
  recommendationReason: RecommendationReason | null
  wordCount: number | null
}

export interface Source {
  id: number
  name: string
  feedUrl: string
  siteUrl: string | null
  category: SourceCategory
  isEnabled: boolean
  lastFetchedAt: string | null
  lastSucceededAt: string | null
  lastError: string | null
  createdAt: string
  recentArticleCount: number
}

export interface SourcesImportReport {
  rejectedCount: number
  importedCount: number
  skippedCount: number
}

export interface CollectionReport {
  succeededSourceCount: number
  failedSourceCount: number
  newArticleCount: number
  purgedArticleCount: number
}

export interface DailyDigest {
  digestDate: string
  articles: DigestArticle[]
  collectionReport: CollectionReport | null
}

export type PreparationStep = 'purging' | 'collecting' | 'downloading-model' | 'analyzing' | 'building-digest' | 'done'

export interface PreparationProgress {
  step: PreparationStep
  completedSourceCount: number
  totalSourceCount: number
}

export interface ArticleContent {
  articleId: number
  title: string
  byline: string | null
  url: string
  contentHtml: string | null
}

export interface AutostartStatus {
  isSupported: boolean
  isEnabled: boolean
}

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export type TopicPreference = 'followed' | 'neutral' | 'muted'

export type RecommendationMode = 'cold-start' | 'similarity' | 'trained' | 'unavailable'

export interface ProfileTopic {
  id: string
  label: string
  preference: TopicPreference
  affinity: number | null
}

export interface SourceAffinity {
  sourceKey: string
  sourceName: string
  likeCount: number
  dislikeCount: number
  affinity: number
}

export interface UserProfile {
  isOnboardingCompleted: boolean
  recommendationMode: RecommendationMode
  likeCount: number
  dislikeCount: number
  topics: ProfileTopic[]
  sourceAffinities: SourceAffinity[]
}

export interface DevFluxApi {
  prepareDailyDigest(): Promise<DailyDigest>
  refreshDailyDigest(): Promise<DailyDigest>
  onPreparationProgress(listener: (progress: PreparationProgress) => void): () => void
  listReadLaterArticles(): Promise<DigestArticle[]>
  listFavoriteArticles(): Promise<DigestArticle[]>
  searchArticles(query: string): Promise<DigestArticle[]>
  exportFavoritesMarkdown(): Promise<boolean>
  getArticleContent(articleId: number): Promise<ArticleContent>
  markArticleAsRead(articleId: number): Promise<void>
  rateArticle(articleId: number, rating: FeedbackRating, reason: FeedbackReason | null): Promise<void>
  clearArticleRating(articleId: number): Promise<void>
  setArticleFavorite(articleId: number, isFavorite: boolean): Promise<void>
  setArticleReadLater(articleId: number, isReadLater: boolean): Promise<void>
  openExternalUrl(url: string): Promise<void>
  listSources(): Promise<Source[]>
  addSource(feedUrl: string, category: SourceCategory): Promise<Source>
  setSourceEnabled(sourceId: number, isEnabled: boolean): Promise<void>
  removeSource(sourceId: number): Promise<void>
  exportSourcesOpml(): Promise<boolean>
  importSourcesOpml(): Promise<SourcesImportReport | null>
  getAutostartStatus(): Promise<AutostartStatus>
  setAutostartEnabled(isEnabled: boolean): Promise<AutostartStatus>
  getThemePreference(): Promise<ThemePreference>
  setThemePreference(themePreference: ThemePreference): Promise<ThemePreference>
  getUserProfile(): Promise<UserProfile>
  completeOnboarding(followedTopicIds: string[]): Promise<UserProfile>
  setTopicPreference(topicId: string, preference: TopicPreference): Promise<UserProfile>
}

export const IPC_CHANNELS = {
  prepareDailyDigest: 'digest:prepare',
  refreshDailyDigest: 'digest:refresh',
  preparationProgress: 'digest:progress',
  listReadLaterArticles: 'articles:list-read-later',
  listFavoriteArticles: 'articles:list-favorites',
  searchArticles: 'articles:search',
  exportFavoritesMarkdown: 'articles:export-favorites-markdown',
  getArticleContent: 'articles:get-content',
  markArticleAsRead: 'articles:mark-read',
  rateArticle: 'articles:rate',
  clearArticleRating: 'articles:clear-rating',
  setArticleFavorite: 'articles:set-favorite',
  setArticleReadLater: 'articles:set-read-later',
  openExternalUrl: 'shell:open-external',
  listSources: 'sources:list',
  addSource: 'sources:add',
  setSourceEnabled: 'sources:set-enabled',
  removeSource: 'sources:remove',
  exportSourcesOpml: 'sources:export-opml',
  importSourcesOpml: 'sources:import-opml',
  getAutostartStatus: 'autostart:get-status',
  setAutostartEnabled: 'autostart:set-enabled',
  getThemePreference: 'theme:get-preference',
  setThemePreference: 'theme:set-preference',
  getUserProfile: 'profile:get',
  completeOnboarding: 'profile:complete-onboarding',
  setTopicPreference: 'profile:set-topic-preference'
} as const
