import { useState } from 'react'
import { CollectionView } from './components/CollectionView'
import { ErrorBanner } from './components/ErrorBanner'
import { NavigationBar } from './components/NavigationBar'
import { OnboardingScreen } from './components/OnboardingScreen'
import { PreparationScreen } from './components/PreparationScreen'
import { ProfileView } from './components/ProfileView'
import { SettingsView } from './components/SettingsView'
import { SourcesView } from './components/SourcesView'
import { TodayView } from './components/TodayView'
import { useArticlePatches } from './hooks/useArticlePatches'
import { useDailyDigest } from './hooks/useDailyDigest'
import { useUserProfile } from './hooks/useUserProfile'
import type { ViewId } from './lib/labels'

function MainApplication() {
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
      case 'profile':
        return <ProfileView />
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

export default function App() {
  const { profileResource, isCompletingOnboarding, actionErrorMessage, completeOnboarding } = useUserProfile()

  if (profileResource.status === 'loading') {
    return (
      <p role="status" className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Chargement de votre profil…
      </p>
    )
  }

  if (profileResource.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">DevFlux</h1>
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <ErrorBanner message={`Impossible de charger votre profil. ${profileResource.errorMessage}`} />
          <button
            type="button"
            onClick={profileResource.reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!profileResource.value.isOnboardingCompleted) {
    return (
      <OnboardingScreen
        topics={profileResource.value.topics}
        isSubmitting={isCompletingOnboarding}
        errorMessage={actionErrorMessage}
        onSubmit={completeOnboarding}
      />
    )
  }

  return <MainApplication />
}
