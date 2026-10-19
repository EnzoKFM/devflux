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
      className="inline-flex shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white"
    >
      {TOPIC_PREFERENCE_CHOICES.map((choice) => {
        const isSelected = choice.preference === preference
        return (
          <button
            key={choice.preference}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(choice.preference)}
            className={`px-3 py-1 text-xs font-medium transition-colors not-first:border-l not-first:border-slate-300 ${
              isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
