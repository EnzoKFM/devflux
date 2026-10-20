import { extract, type FeedData, type FeedEntry } from '@extractus/feed-extractor'

export const FEED_FETCH_TIMEOUT_IN_MS = 15_000
export const FEED_USER_AGENT = 'DevFlux/0.1'

export type CollectedFeedEntry = FeedEntry & { fullContent?: string }

export type FeedFetcher = (feedUrl: string, abortSignal: AbortSignal) => Promise<FeedData>

function readTextNode(rawNode: unknown): string | undefined {
  if (typeof rawNode === 'string') {
    return rawNode.trim() || undefined
  }
  if (rawNode !== null && typeof rawNode === 'object' && '#text' in rawNode) {
    return readTextNode(rawNode['#text'])
  }
  return undefined
}

export function extractEntryFullContent(rawEntry: Record<string, unknown>): string | undefined {
  return readTextNode(rawEntry['content:encoded']) ?? readTextNode(rawEntry.content)
}

export const defaultFeedFetcher: FeedFetcher = (feedUrl, abortSignal) =>
  extract(
    feedUrl,
    {
      descriptionMaxLen: 0,
      getExtraEntryFields: (rawEntry) => ({ fullContent: extractEntryFullContent(rawEntry) })
    },
    (requestedUrl) =>
    fetch(requestedUrl, {
      signal: abortSignal,
      headers: {
        'User-Agent': FEED_USER_AGENT,
        Accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, */*'
      }
    })
  )

export async function fetchFeedWithTimeout(
  feedUrl: string,
  fetchFeed: FeedFetcher,
  timeoutInMs: number = FEED_FETCH_TIMEOUT_IN_MS
): Promise<FeedData> {
  const abortController = new AbortController()
  let timeoutHandle: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      abortController.abort()
      reject(new Error(`Délai dépassé (${Math.round(timeoutInMs / 1000)} s)`))
    }, timeoutInMs)
  })
  try {
    return await Promise.race([fetchFeed(feedUrl, abortController.signal), timeoutPromise])
  } finally {
    clearTimeout(timeoutHandle)
  }
}
