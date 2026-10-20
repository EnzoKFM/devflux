import { readFileSync, statSync } from 'node:fs'
import { DOMParser } from 'linkedom'
import type { Source, SourceCategory } from '@shared/contract'
import { parseHttpUrl } from '../httpUrl'
import type { NewSource } from '../repositories/sourceRepository'
import { isSourceCategory } from './sourceCategory'

export const OPML_DEFAULT_CATEGORY: SourceCategory = 'general'
export const OPML_MAX_FILE_SIZE_IN_BYTES = 5 * 1024 * 1024

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
}

function escapeXmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character])
}

function buildOutline(source: Source): string {
  const escapedName = escapeXmlAttribute(source.name)
  const siteAttribute = source.siteUrl ? ` htmlUrl="${escapeXmlAttribute(source.siteUrl)}"` : ''
  return `    <outline type="rss" text="${escapedName}" title="${escapedName}" xmlUrl="${escapeXmlAttribute(source.feedUrl)}"${siteAttribute} category="${source.category}"/>`
}

export function buildSourcesOpml(sources: Source[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>Sources DevFlux</title>',
    '  </head>',
    '  <body>',
    ...sources.map(buildOutline),
    '  </body>',
    '</opml>',
    ''
  ].join('\n')
}

interface OutlineElement {
  getAttribute(attributeName: string): string | null
}

function readTrimmedAttribute(outline: OutlineElement, attributeName: string): string | null {
  const attributeValue = outline.getAttribute(attributeName)?.trim()
  return attributeValue ? attributeValue : null
}

export interface ParsedSourcesOpml {
  newSources: NewSource[]
  rejectedFeedCount: number
}

export function parseSourcesOpml(opmlText: string): ParsedSourcesOpml {
  const opmlDocument = new DOMParser().parseFromString(opmlText, 'text/html')
  const newSources: NewSource[] = []
  let rejectedFeedCount = 0
  for (const outline of opmlDocument.querySelectorAll('outline')) {
    const rawFeedUrl = readTrimmedAttribute(outline, 'xmlUrl')
    if (rawFeedUrl === null) {
      continue
    }
    const feedUrl = parseHttpUrl(rawFeedUrl)
    if (!feedUrl) {
      rejectedFeedCount += 1
      continue
    }
    const category = readTrimmedAttribute(outline, 'category')
    newSources.push({
      name: readTrimmedAttribute(outline, 'text') ?? readTrimmedAttribute(outline, 'title') ?? feedUrl.hostname,
      feedUrl: feedUrl.href,
      siteUrl: parseHttpUrl(readTrimmedAttribute(outline, 'htmlUrl'))?.href ?? null,
      category: isSourceCategory(category) ? category : OPML_DEFAULT_CATEGORY
    })
  }
  return { newSources, rejectedFeedCount }
}

export function readOpmlFile(opmlFilePath: string): string {
  if (statSync(opmlFilePath).size > OPML_MAX_FILE_SIZE_IN_BYTES) {
    throw new Error('Ce fichier OPML est trop volumineux (5 Mo au maximum).')
  }
  return readFileSync(opmlFilePath, 'utf8')
}
