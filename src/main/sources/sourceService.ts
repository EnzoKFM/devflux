import type Database from 'better-sqlite3'
import type { FeedData } from '@extractus/feed-extractor'
import type { Source, SourceCategory } from '@shared/contract'
import { defaultFeedFetcher, fetchFeedWithTimeout, type FeedFetcher } from '../collector/feedFetcher'
import { parseHttpUrl } from '../httpUrl'
import {
  deleteSource,
  insertSource,
  isFeedUrlRegistered,
  setSourceEnabled as persistSourceEnabled
} from '../repositories/sourceRepository'

export interface AddSourceOptions {
  fetchFeed?: FeedFetcher
  now?: () => Date
}

function resolveSourceName(feed: FeedData, feedUrl: URL): string {
  const feedTitle = typeof feed.title === 'string' ? feed.title.trim() : ''
  return feedTitle.length > 0 ? feedTitle : feedUrl.hostname
}

function resolveSiteUrl(feed: FeedData): string | null {
  return parseHttpUrl(feed.link)?.href ?? null
}

export async function addSource(
  database: Database.Database,
  rawFeedUrl: string,
  category: SourceCategory,
  options: AddSourceOptions = {}
): Promise<Source> {
  const feedUrl = parseHttpUrl(rawFeedUrl)
  if (!feedUrl) {
    throw new Error("L'adresse du flux est invalide : elle doit commencer par http:// ou https://.")
  }
  if (isFeedUrlRegistered(database, feedUrl.href)) {
    throw new Error('Ce flux est déjà dans votre liste de sources.')
  }

  let feed: FeedData
  try {
    feed = await fetchFeedWithTimeout(feedUrl.href, options.fetchFeed ?? defaultFeedFetcher)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Impossible de lire ce flux (${reason}). Vérifiez l'adresse : elle doit pointer vers un flux RSS, Atom ou JSON.`,
      { cause: error }
    )
  }

  return insertSource(
    database,
    {
      name: resolveSourceName(feed, feedUrl),
      feedUrl: feedUrl.href,
      siteUrl: resolveSiteUrl(feed),
      category
    },
    (options.now ?? (() => new Date()))().toISOString()
  )
}

export function setSourceEnabled(database: Database.Database, sourceId: number, isEnabled: boolean): void {
  persistSourceEnabled(database, sourceId, isEnabled)
}

export function removeSource(database: Database.Database, sourceId: number): void {
  deleteSource(database, sourceId)
}
