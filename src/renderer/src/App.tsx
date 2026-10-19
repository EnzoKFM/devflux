import { useState } from 'react'
import { CollectionView } from './components/CollectionView'
import { NavigationBar } from './components/NavigationBar'
import { PreparationScreen } from './components/PreparationScreen'
import { SettingsView } from './components/SettingsView'
import { SourcesView } from './components/SourcesView'
import { TodayView } from './components/TodayView'
import { useArticlePatches } from './hooks/useArticlePatches'
import { useDailyDigest } from './hooks/useDailyDigest'
import type { ViewId } from './lib/labels'

export default function App() {
  const { digestResource, preparationProgress, retryPreparation } = useDailyDigest()
  const { applyArticlePatch, applyPatchesToArticles } = useArticlePatches()
  const [currentViewId, setCurrentViewId] = useState<ViewId>('today')

  if (digestResource.status !== 'success') {
    return (
      <PreparationScreen
        progress={preparationProgress}
        errorMessage={digestResource.status === 'error' ? digestResource.errorMessage : null}
        onRetry={retryPreparation}
      />
    )
  }

  const renderCurrentView = () => {
    switch (currentViewId) {
      case 'today':
        return (
          <TodayView
            digest={digestResource.value}
            patchedArticlesOf={applyPatchesToArticles}
            applyArticlePatch={applyArticlePatch}
          />
        )
      case 'read-later':
      case 'favorites':
        return (
          <CollectionView
            key={currentViewId}
            collectionKind={currentViewId}
            patchedArticlesOf={applyPatchesToArticles}
            applyArticlePatch={applyArticlePatch}
          />
        )
      case 'sources':
        return <SourcesView />
      case 'settings':
        return <SettingsView />
    }
  }

  return (
    <div className="flex h-full">
      <NavigationBar currentViewId={currentViewId} onNavigate={setCurrentViewId} />
      <main className="min-w-0 flex-1">{renderCurrentView()}</main>
    </div>
  )
}
