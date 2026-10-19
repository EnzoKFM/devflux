import { useMemo, type MouseEvent } from 'react'
import { sanitizeArticleHtml } from '@renderer/lib/sanitizeArticleHtml'

interface ArticleContentBodyProps {
  contentHtml: string
  baseUrl: string
  onOpenLink: (url: string) => void
}

const MIDDLE_MOUSE_BUTTON = 1

function resolveExternalUrl(href: string | null, baseUrl: string): string | null {
  if (href === null || href.startsWith('#')) {
    return null
  }
  try {
    const resolvedUrl = new URL(href, baseUrl)
    return resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:' ? resolvedUrl.href : null
  } catch {
    return null
  }
}

export function ArticleContentBody({ contentHtml, baseUrl, onOpenLink }: ArticleContentBodyProps) {
  const sanitizedHtml = useMemo(() => sanitizeArticleHtml(contentHtml), [contentHtml])

  const interceptLinkClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) {
      return
    }
    const clickedAnchor = event.target.closest('a')
    if (clickedAnchor === null) {
      return
    }
    event.preventDefault()
    const externalUrl = resolveExternalUrl(clickedAnchor.getAttribute('href'), baseUrl)
    if (externalUrl !== null) {
      onOpenLink(externalUrl)
    }
  }

  const interceptAuxiliaryClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.button === MIDDLE_MOUSE_BUTTON) {
      interceptLinkClick(event)
    }
  }

  return (
    <div
      className="article-prose"
      onClick={interceptLinkClick}
      onAuxClick={interceptAuxiliaryClick}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
