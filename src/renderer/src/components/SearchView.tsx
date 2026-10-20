import { useState } from 'react'
import { SEARCH_QUERY_MAX_LENGTH, type DigestArticle } from '@shared/contract'
import { useAsyncResource } from '@renderer/hooks/useAsyncResource'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
import { useDebouncedValue } from '@renderer/hooks/useDebouncedValue'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleListView } from './ArticleListView'

const SEARCH_DEBOUNCE_IN_MILLISECONDS = 250

interface SearchViewProps {
  patchedArticlesOf: (articles: DigestArticle[]) => DigestArticle[]
  applyArticlePatch: ApplyArticlePatch
}

export function SearchView({ patchedArticlesOf, applyArticlePatch }: SearchViewProps) {
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_IN_MILLISECONDS)
  const searchResource = useAsyncResource(
    () => (searchQuery === '' ? Promise.resolve([]) : window.devflux.searchArticles(searchQuery)),
    `search-${searchQuery}`
  )

  const articles = searchResource.status === 'success' ? patchedArticlesOf(searchResource.value) : []

  const describeEmptyState = (): string => {
    if (searchQuery === '') {
      return 'Saisissez un terme pour rechercher dans tous les articles collectés.'
    }
    if (searchResource.status === 'loading') {
      return 'Recherche en cours…'
    }
    if (searchResource.status === 'error') {
      return `Impossible de lancer la recherche. ${searchResource.errorMessage}`
    }
    return `Aucun article trouvé pour « ${searchQuery} ».`
  }

  return (
    <ArticleListView
      articles={articles}
      applyArticlePatch={applyArticlePatch}
      emptyMessage={describeEmptyState()}
      header={
        <>
          <ArticleListHeader title="Recherche" articleCount={articles.length} />
          <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              autoFocus
              aria-label="Rechercher dans les articles"
              placeholder="Titre, résumé ou source…"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </>
      }
    />
  )
}
