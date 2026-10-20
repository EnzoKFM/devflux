import type { TopicPreference } from '@shared/contract'
import { TOPIC_PREFERENCE_CHOICES } from '@renderer/lib/labels'

interface TopicPreferencePickerProps {
  topicLabel: string
  preference: TopicPreference
  onChange: (preference: TopicPreference) => void
}

export function TopicPreferencePicker({ topicLabel, preference, onChange }: TopicPreferencePickerProps) {
  return (
    <div
      role="group"
      aria-label={`Préférence pour le sujet ${topicLabel}`}
      className="inline-flex shrink-0 overflow-hidden rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
    >
      {TOPIC_PREFERENCE_CHOICES.map((choice) => {
        const isSelected = choice.preference === preference
        return (
          <button
            key={choice.preference}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(choice.preference)}
            className={`px-3 py-1 text-xs font-medium transition-colors not-first:border-l not-first:border-slate-300 dark:not-first:border-slate-600 ${
              isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
