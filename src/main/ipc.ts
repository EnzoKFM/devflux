import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import type Database from 'better-sqlite3'
import {
  IPC_CHANNELS,
  type ArticleContent,
  type AutostartStatus,
  type DailyDigest,
  type DigestArticle,
  type PreparationProgress,
  type Source,
  type UserProfile
} from '@shared/contract'
import {
  getAutostartStatus,
  setAutostartEnabled,
  type AutostartContext
} from './autostart'
import { prepareDailyDigest } from './digest/dailyDigestService'
import {
  parseBoolean,
  parseCategory,
  parseHttpUrlArgument,
  parseIdentifier,
  parseRating,
  parseReason,
  parseTopicId,
  parseTopicIds,
  parseTopicPreference
} from './ipcValidation'
import { completeOnboarding, getUserProfile, setTopicPreference } from './profile/profileService'
import type { EmbeddingProvider } from './recommendation/embeddingProvider'
import { extractArticleContent } from './reader/articleExtractor'
import {
  findArticleById,
  listFavoriteArticles,
  listReadLaterArticles,
  markArticleAsRead,
  setArticleFavorite,
  setArticleReadLater
} from './repositories/articleRepository'
import { deleteFeedback, saveFeedback } from './repositories/feedbackRepository'
import { listSources } from './repositories/sourceRepository'
import { addSource, removeSource, setSourceEnabled } from './sources/sourceService'

export interface IpcDependencies {
  database: Database.Database
  autostartContext: AutostartContext
  embeddingProvider: EmbeddingProvider
}

function requireArticle(database: Database.Database, articleId: number): DigestArticle {
  const article = findArticleById(database, articleId)
  if (!article) {
    throw new Error(`Article introuvable (id ${articleId}).`)
  }
  return article
}

export function registerIpcHandlers({ database, autostartContext, embeddingProvider }: IpcDependencies): void {
  let pendingPreparation: Promise<DailyDigest> | null = null

  ipcMain.handle(IPC_CHANNELS.prepareDailyDigest, (event: IpcMainInvokeEvent): Promise<DailyDigest> => {
    if (!pendingPreparation) {
      const sendProgress = (progress: PreparationProgress): void => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.preparationProgress, progress)
        }
      }
      pendingPreparation = prepareDailyDigest(database, { embeddingProvider, onProgress: sendProgress }).finally(() => {
        pendingPreparation = null
      })
    }
    return pendingPreparation
  })

  ipcMain.handle(IPC_CHANNELS.listReadLaterArticles, (): DigestArticle[] => listReadLaterArticles(database))

  ipcMain.handle(IPC_CHANNELS.listFavoriteArticles, (): DigestArticle[] => listFavoriteArticles(database))

  ipcMain.handle(
    IPC_CHANNELS.getArticleContent,
    (_event, articleIdArgument: unknown): Promise<ArticleContent> => {
      const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
      return extractArticleContent({ articleId: article.id, title: article.title, url: article.url })
    }
  )

  ipcMain.handle(IPC_CHANNELS.markArticleAsRead, (_event, articleIdArgument: unknown): void => {
    const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
    markArticleAsRead(database, article.id, new Date().toISOString())
  })

  ipcMain.handle(
    IPC_CHANNELS.rateArticle,
    (_event, articleIdArgument: unknown, ratingArgument: unknown, reasonArgument: unknown): void => {
      const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
      saveFeedback(database, article.id, parseRating(ratingArgument), parseReason(reasonArgument), new Date().toISOString())
    }
  )

  ipcMain.handle(IPC_CHANNELS.clearArticleRating, (_event, articleIdArgument: unknown): void => {
    const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
    deleteFeedback(database, article.id)
  })

  ipcMain.handle(
    IPC_CHANNELS.setArticleFavorite,
    (_event, articleIdArgument: unknown, isFavoriteArgument: unknown): void => {
      const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
      setArticleFavorite(database, article.id, parseBoolean(isFavoriteArgument, 'isFavorite'))
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.setArticleReadLater,
    (_event, articleIdArgument: unknown, isReadLaterArgument: unknown): void => {
      const article = requireArticle(database, parseIdentifier(articleIdArgument, 'articleId'))
      setArticleReadLater(database, article.id, parseBoolean(isReadLaterArgument, 'isReadLater'))
    }
  )

  ipcMain.handle(IPC_CHANNELS.openExternalUrl, (_event, urlArgument: unknown): Promise<void> => {
    return shell.openExternal(parseHttpUrlArgument(urlArgument, 'url'))
  })

  ipcMain.handle(IPC_CHANNELS.listSources, (): Source[] => listSources(database))

  ipcMain.handle(
    IPC_CHANNELS.addSource,
    (_event, feedUrlArgument: unknown, categoryArgument: unknown): Promise<Source> =>
      addSource(database, parseHttpUrlArgument(feedUrlArgument, 'feedUrl'), parseCategory(categoryArgument))
  )

  ipcMain.handle(
    IPC_CHANNELS.setSourceEnabled,
    (_event, sourceIdArgument: unknown, isEnabledArgument: unknown): void => {
      setSourceEnabled(
        database,
        parseIdentifier(sourceIdArgument, 'sourceId'),
        parseBoolean(isEnabledArgument, 'isEnabled')
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.removeSource, (_event, sourceIdArgument: unknown): void => {
    removeSource(database, parseIdentifier(sourceIdArgument, 'sourceId'))
  })

  ipcMain.handle(IPC_CHANNELS.getAutostartStatus, (): AutostartStatus => getAutostartStatus(autostartContext))

  ipcMain.handle(
    IPC_CHANNELS.setAutostartEnabled,
    (_event, isEnabledArgument: unknown): AutostartStatus =>
      setAutostartEnabled(autostartContext, parseBoolean(isEnabledArgument, 'isEnabled'))
  )

  ipcMain.handle(IPC_CHANNELS.getUserProfile, (): UserProfile => getUserProfile(database, embeddingProvider))

  ipcMain.handle(
    IPC_CHANNELS.completeOnboarding,
    (_event, followedTopicIdsArgument: unknown): UserProfile =>
      completeOnboarding(
        database,
        parseTopicIds(followedTopicIdsArgument, 'followedTopicIds'),
        new Date().toISOString(),
        embeddingProvider
      )
  )

  ipcMain.handle(
    IPC_CHANNELS.setTopicPreference,
    (_event, topicIdArgument: unknown, preferenceArgument: unknown): UserProfile =>
      setTopicPreference(
        database,
        parseTopicId(topicIdArgument, 'topicId'),
        parseTopicPreference(preferenceArgument),
        embeddingProvider
      )
  )
}
