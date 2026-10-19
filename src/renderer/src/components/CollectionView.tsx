import type { DigestArticle } from '@shared/contract'
import { useAsyncResource } from '@renderer/hooks/useAsyncResource'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleListView } from './ArticleListView'

export type CollectionKind = 'read-later' | 'favorites'

interface CollectionViewProps {
  collectionKind: CollectionKind
  patchedArticlesOf: (articles: DigestArticle[]) => DigestArticle[]
  applyArticlePatch: ApplyArticlePatch
}

const COLLECTION_PRESENTATIONS = {
  'read-later': {
    title: 'Plus tard',
    emptyMessage: 'Aucun article à lire plus tard.',
    load: () => window.devflux.listReadLaterArticles(),
    isMember: (article: DigestArticle) => article.isReadLater
  },
  favorites: {
    title: 'Favoris',
    emptyMessage: 'Aucun article en favori.',
    load: () => window.devflux.listFavoriteArticles(),
    isMember: (article: DigestArticle) => article.isFavorite
  }
}

export function CollectionView({ collectionKind, patchedArticlesOf, applyArticlePatch }: CollectionViewProps) {
  const presentation = COLLECTION_PRESENTATIONS[collectionKind]
  const articlesResource = useAsyncResource(presentation.load, `collection-${collectionKind}`)

  if (articlesResource.status === 'loading') {
    return (
      <p role="status" className="px-6 py-6 text-sm text-slate-500">
        Chargement…
      </p>
    )
  }

  if (articlesResource.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 px-6 py-6">
        <p className="text-sm text-red-700">Impossible de charger « {presentation.title} ». {articlesResource.errorMessage}</p>
        <button
          type="button"
          onClick={articlesResource.reload}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const articles = patchedArticlesOf(articlesResource.value).filter(presentation.isMember)

  return (
    <ArticleListView
      articles={articles}
      applyArticlePatch={applyArticlePatch}
      emptyMessage={presentation.emptyMessage}
      header={<ArticleListHeader title={presentation.title} articleCount={articles.length} />}
    />
  )
}
