import { writeFileSync } from 'node:fs'
import { BrowserWindow, dialog, ipcMain, nativeTheme, Notification, shell, type IpcMainInvokeEvent } from 'electron'
import type Database from 'better-sqlite3'
import {
  IPC_CHANNELS,
  type ArticleContent,
  type AutostartStatus,
  type DailyDigest,
  type DigestArticle,
  type PreparationProgress,
  type ThemePreference,
  type Source,
  type SourcesImportReport,
  type UserProfile
} from '@shared/contract'
import {
  getAutostartStatus,
  setAutostartEnabled,
  type AutostartContext
} from './autostart'
import { prepareDailyDigest } from './digest/dailyDigestService'
import { buildDigestReadyNotification } from './digest/digestNotification'
import { buildFavoritesMarkdown } from './exports/favoritesMarkdown'
import {
  parseBoolean,
  parseCategory,
  parseHttpUrlArgument,
  parseIdentifier,
  parseRating,
  parseReason,
  parseSearchQuery,
  parseTopicId,
  parseTopicIds,
  parseThemePreference,
  parseTopicPreference
} from './ipcValidation'
import { completeOnboarding, getUserProfile, setTopicPreference } from './profile/profileService'
import type { EmbeddingProvider } from './recommendation/embeddingProvider'
import { loadArticleContent } from './reader/readerService'
import {
  listFavoriteArticles,
  listReadLaterArticles,
  markArticleAsRead,
  requireArticle,
  searchArticles,
  setArticleFavorite,
  setArticleReadLater
} from './repositories/articleRepository'
import { deleteFeedback, saveFeedback } from './repositories/feedbackRepository'
import { listSources } from './repositories/sourceRepository'
import { buildSourcesOpml, parseSourcesOpml, readOpmlFile } from './sources/opml'
import { addSource, importSources, removeSource, setSourceEnabled } from './sources/sourceService'
import { readThemePreference, saveThemePreference } from './theme'

export interface IpcDependencies {
  database: Database.Database
  autostartContext: AutostartContext
  embeddingProvider: EmbeddingProvider
}

function showDigestReadyNotification(dailyDigest: DailyDigest, digestWindow: BrowserWindow | null): void {
  const digestReadyNotification = buildDigestReadyNotification(dailyDigest)
  if (!digestReadyNotification || !Notification.isSupported() || digestWindow?.isFocused()) {
    return
  }
  try {
    const systemNotification = new Notification(digestReadyNotification)
    systemNotification.on('click', () => {
      if (digestWindow && !digestWindow.isDestroyed()) {
        digestWindow.show()
        digestWindow.focus()
      }
    })
    systemNotification.show()
  } catch (error) {
    console.error('Notification du fil du jour impossible', error)
  }
}

async function saveTextFile(
  event: IpcMainInvokeEvent,
  dialogTitle: string,
  defaultFileName: string,
  fileFilter: Electron.FileFilter,
  buildContent: () => string
): Promise<boolean> {
  const saveDialogOptions: Electron.SaveDialogOptions = {
    title: dialogTitle,
    defaultPath: defaultFileName,
    filters: [fileFilter]
  }
  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const saveDialogResult = parentWindow
    ? await dialog.showSaveDialog(parentWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions)
  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return false
  }
  writeFileSync(saveDialogResult.filePath, buildContent(), 'utf8')
  return true
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
      const digestWindow = BrowserWindow.fromWebContents(event.sender)
      pendingPreparation = prepareDailyDigest(database, { embeddingProvider, onProgress: sendProgress })
        .then((dailyDigest) => {
          showDigestReadyNotification(dailyDigest, digestWindow)
          return dailyDigest
        })
        .finally(() => {
          pendingPreparation = null
        })
    }
    return pendingPreparation
  })

  ipcMain.handle(IPC_CHANNELS.listReadLaterArticles, (): DigestArticle[] => listReadLaterArticles(database))

  ipcMain.handle(IPC_CHANNELS.listFavoriteArticles, (): DigestArticle[] => listFavoriteArticles(database))

  ipcMain.handle(
    IPC_CHANNELS.searchArticles,
    (_event, queryArgument: unknown): DigestArticle[] => searchArticles(database, parseSearchQuery(queryArgument))
  )

  ipcMain.handle(
    IPC_CHANNELS.exportFavoritesMarkdown,
    (event: IpcMainInvokeEvent): Promise<boolean> =>
      saveTextFile(
        event,
        'Exporter les favoris',
        'favoris-devflux.md',
        { name: 'Markdown', extensions: ['md'] },
        () => buildFavoritesMarkdown(listFavoriteArticles(database))
      )
  )

  ipcMain.handle(
    IPC_CHANNELS.getArticleContent,
    (_event, articleIdArgument: unknown): Promise<ArticleContent> => {
      return loadArticleContent(database, parseIdentifier(articleIdArgument, 'articleId'))
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

  ipcMain.handle(
    IPC_CHANNELS.exportSourcesOpml,
    (event: IpcMainInvokeEvent): Promise<boolean> =>
      saveTextFile(
        event,
        'Exporter les sources',
        'sources-devflux.opml',
        { name: 'OPML', extensions: ['opml', 'xml'] },
        () => buildSourcesOpml(listSources(database))
      )
  )

  ipcMain.handle(
    IPC_CHANNELS.importSourcesOpml,
    async (event: IpcMainInvokeEvent): Promise<SourcesImportReport | null> => {
      const openDialogOptions: Electron.OpenDialogOptions = {
        title: 'Importer des sources',
        properties: ['openFile'],
        filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }]
      }
      const parentWindow = BrowserWindow.fromWebContents(event.sender)
      const openDialogResult = parentWindow
        ? await dialog.showOpenDialog(parentWindow, openDialogOptions)
        : await dialog.showOpenDialog(openDialogOptions)
      const [opmlFilePath] = openDialogResult.filePaths
      if (openDialogResult.canceled || !opmlFilePath) {
        return null
      }
      const parsedSourcesOpml = parseSourcesOpml(readOpmlFile(opmlFilePath))
      return {
        ...importSources(database, parsedSourcesOpml.newSources, new Date().toISOString()),
        rejectedCount: parsedSourcesOpml.rejectedFeedCount
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.getAutostartStatus, (): AutostartStatus => getAutostartStatus(autostartContext))

  ipcMain.handle(
    IPC_CHANNELS.setAutostartEnabled,
    (_event, isEnabledArgument: unknown): AutostartStatus =>
      setAutostartEnabled(autostartContext, parseBoolean(isEnabledArgument, 'isEnabled'))
  )

  ipcMain.handle(IPC_CHANNELS.getThemePreference, (): ThemePreference => readThemePreference(database))

  ipcMain.handle(IPC_CHANNELS.setThemePreference, (_event, themePreferenceArgument: unknown): ThemePreference => {
    const themePreference = parseThemePreference(themePreferenceArgument)
    saveThemePreference(database, themePreference)
    nativeTheme.themeSource = themePreference
    return themePreference
  })

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
