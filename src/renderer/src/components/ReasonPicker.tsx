import type { FeedbackReason } from '@shared/contract'
import { FEEDBACK_REASON_CHOICES } from '@renderer/lib/labels'

interface ReasonPickerProps {
  onChoose: (reason: FeedbackReason | null) => void
  onCancel: () => void
}

export function ReasonPicker({ onChoose, onCancel }: ReasonPickerProps) {
  return (
    <div
      role="group"
      aria-label="Raison du « Pas pour moi »"
      className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-2"
    >
      <span className="mr-1 text-xs font-medium text-slate-600">Pourquoi ?</span>
      {FEEDBACK_REASON_CHOICES.map((reasonChoice, choiceIndex) => (
        <button
          key={reasonChoice.label}
          type="button"
          autoFocus={choiceIndex === 0}
          onClick={() => onChoose(reasonChoice.reason)}
          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
        >
          {reasonChoice.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Annuler le choix de la raison"
        title="Annuler"
        className="rounded-full px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
      >
        Annuler
      </button>
    </div>
  )
}
