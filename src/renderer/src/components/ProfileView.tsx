import type { SourceAffinity, UserProfile } from '@shared/contract'
import { useUserProfile } from '@renderer/hooks/useUserProfile'
import { describeRecommendationMode } from '@renderer/lib/recommendationMode'
import { AffinityGauge } from './AffinityGauge'
import { ErrorBanner } from './ErrorBanner'
import { TopicPreferencePicker } from './TopicPreferencePicker'

interface SourceAffinityRowProps {
  sourceAffinity: SourceAffinity
}

function SourceAffinityRow({ sourceAffinity }: SourceAffinityRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100" title={sourceAffinity.sourceName}>
        {sourceAffinity.sourceName}
      </span>
      <span className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          <span>
            <span aria-hidden="true">👍</span> {sourceAffinity.likeCount}
            <span className="sr-only"> aimés</span>
          </span>
          <span aria-hidden="true"> · </span>
          <span>
            <span aria-hidden="true">👎</span> {sourceAffinity.dislikeCount}
            <span className="sr-only"> écartés</span>
          </span>
        </span>
        <AffinityGauge affinity={sourceAffinity.affinity} />
      </span>
    </li>
  )
}

interface ProfileContentProps {
  profile: UserProfile
  onSetTopicPreference: ReturnType<typeof useUserProfile>['setTopicPreference']
}

function ProfileContent({ profile, onSetTopicPreference }: ProfileContentProps) {
  return (
    <>
      <section
        aria-label="État de la recommandation"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-4 py-3"
      >
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
          {describeRecommendationMode(profile.recommendationMode)}
        </p>
        <p className="flex gap-3 text-sm text-indigo-900 dark:text-indigo-100">
          <span>
            <span aria-hidden="true">👍</span> {profile.likeCount}
            <span className="sr-only"> articles aimés</span>
          </span>
          <span>
            <span aria-hidden="true">👎</span> {profile.dislikeCount}
            <span className="sr-only"> articles écartés</span>
          </span>
        </p>
      </section>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Vos changements s’appliquent au prochain fil (demain), le fil du jour ne change pas.
      </p>
      <section aria-labelledby="profile-topics-title" className="flex flex-col gap-3">
        <h2 id="profile-topics-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Sujets
        </h2>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {profile.topics.map((topic) => (
            <li key={topic.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 font-medium text-slate-900 dark:text-slate-100">{topic.label}</span>
              <span className="flex shrink-0 items-center gap-4">
                {topic.affinity !== null && <AffinityGauge affinity={topic.affinity} />}
                <TopicPreferencePicker
                  topicLabel={topic.label}
                  preference={topic.preference}
                  onChange={(preference) => onSetTopicPreference(topic.id, topic.preference, preference)}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="profile-sources-title" className="flex flex-col gap-3">
        <h2 id="profile-sources-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Affinités des sources
        </h2>
        {profile.sourceAffinities.length === 0 ? (
          <p className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Aucune note pour le moment : notez des articles pour faire apparaître vos affinités.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {profile.sourceAffinities.map((sourceAffinity) => (
              <SourceAffinityRow key={sourceAffinity.sourceKey} sourceAffinity={sourceAffinity} />
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">Pour exclure une source, désactivez-la dans Sources.</p>
      </section>
    </>
  )
}

export function ProfileView() {
  const { profileResource, actionErrorMessage, setTopicPreference } = useUserProfile()

  const renderContent = () => {
    if (profileResource.status === 'loading') {
      return (
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          Chargement du profil…
        </p>
      )
    }

    if (profileResource.status === 'error') {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger le profil. {profileResource.errorMessage}</p>
          <button
            type="button"
            onClick={profileResource.reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      )
    }

    return <ProfileContent profile={profileResource.value} onSetTopicPreference={setTopicPreference} />
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mon profil</h1>
        {actionErrorMessage && <ErrorBanner message={actionErrorMessage} />}
        {renderContent()}
      </div>
    </div>
  )
}
