import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, type DevFluxApi, type PreparationProgress } from '@shared/contract'

const devFluxApi: DevFluxApi = {
  prepareDailyDigest: () => ipcRenderer.invoke(IPC_CHANNELS.prepareDailyDigest),
  onPreparationProgress: (listener) => {
    const progressHandler = (_event: IpcRendererEvent, progress: PreparationProgress): void => listener(progress)
    ipcRenderer.on(IPC_CHANNELS.preparationProgress, progressHandler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.preparationProgress, progressHandler)
  },
  listReadLaterArticles: () => ipcRenderer.invoke(IPC_CHANNELS.listReadLaterArticles),
  listFavoriteArticles: () => ipcRenderer.invoke(IPC_CHANNELS.listFavoriteArticles),
  getArticleContent: (articleId) => ipcRenderer.invoke(IPC_CHANNELS.getArticleContent, articleId),
  markArticleAsRead: (articleId) => ipcRenderer.invoke(IPC_CHANNELS.markArticleAsRead, articleId),
  rateArticle: (articleId, rating, reason) => ipcRenderer.invoke(IPC_CHANNELS.rateArticle, articleId, rating, reason),
  clearArticleRating: (articleId) => ipcRenderer.invoke(IPC_CHANNELS.clearArticleRating, articleId),
  setArticleFavorite: (articleId, isFavorite) => ipcRenderer.invoke(IPC_CHANNELS.setArticleFavorite, articleId, isFavorite),
  setArticleReadLater: (articleId, isReadLater) =>
    ipcRenderer.invoke(IPC_CHANNELS.setArticleReadLater, articleId, isReadLater),
  openExternalUrl: (url) => ipcRenderer.invoke(IPC_CHANNELS.openExternalUrl, url),
  listSources: () => ipcRenderer.invoke(IPC_CHANNELS.listSources),
  addSource: (feedUrl, category) => ipcRenderer.invoke(IPC_CHANNELS.addSource, feedUrl, category),
  setSourceEnabled: (sourceId, isEnabled) => ipcRenderer.invoke(IPC_CHANNELS.setSourceEnabled, sourceId, isEnabled),
  removeSource: (sourceId) => ipcRenderer.invoke(IPC_CHANNELS.removeSource, sourceId),
  getAutostartStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getAutostartStatus),
  setAutostartEnabled: (isEnabled) => ipcRenderer.invoke(IPC_CHANNELS.setAutostartEnabled, isEnabled),
  getUserProfile: () => ipcRenderer.invoke(IPC_CHANNELS.getUserProfile),
  completeOnboarding: (followedTopicIds) => ipcRenderer.invoke(IPC_CHANNELS.completeOnboarding, followedTopicIds),
  setTopicPreference: (topicId, preference) => ipcRenderer.invoke(IPC_CHANNELS.setTopicPreference, topicId, preference)
}

contextBridge.exposeInMainWorld('devflux', devFluxApi)
