import { useRef, useState } from 'react'
import type { TopicPreference } from '@shared/contract'
import { describeError } from '@renderer/lib/describeError'
import { useAsyncResource } from './useAsyncResource'

export function useUserProfile() {
  const profileResource = useAsyncResource(() => window.devflux.getUserProfile(), 'user-profile')
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const { updateValue: updateProfile } = profileResource
  const latestTopicPreferenceRequestNumber = useRef(0)

  const completeOnboarding = async (followedTopicIds: string[]): Promise<void> => {
    setIsCompletingOnboarding(true)
    setActionErrorMessage(null)
    try {
      const completedProfile = await window.devflux.completeOnboarding(followedTopicIds)
      updateProfile(() => completedProfile)
    } catch (error) {
      setActionErrorMessage(`Impossible d’enregistrer vos préférences. (${describeError(error)})`)
    } finally {
      setIsCompletingOnboarding(false)
    }
  }

  const setTopicPreference = async (
    topicId: string,
    previousPreference: TopicPreference,
    preference: TopicPreference
  ): Promise<void> => {
    const applyPreference = (appliedPreference: TopicPreference) =>
      updateProfile((profile) => ({
        ...profile,
        topics: profile.topics.map((topic) =>
          topic.id === topicId ? { ...topic, preference: appliedPreference } : topic
        )
      }))

    const requestNumber = latestTopicPreferenceRequestNumber.current + 1
    latestTopicPreferenceRequestNumber.current = requestNumber
    setActionErrorMessage(null)
    applyPreference(preference)
    try {
      const updatedProfile = await window.devflux.setTopicPreference(topicId, preference)
      if (requestNumber === latestTopicPreferenceRequestNumber.current) {
        updateProfile(() => updatedProfile)
      }
    } catch (error) {
      applyPreference(previousPreference)
      setActionErrorMessage(`Impossible de modifier le sujet. (${describeError(error)})`)
    }
  }

  return { profileResource, isCompletingOnboarding, actionErrorMessage, completeOnboarding, setTopicPreference }
}
