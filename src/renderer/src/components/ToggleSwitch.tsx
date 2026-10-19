interface ToggleSwitchProps {
  isChecked: boolean
  isDisabled?: boolean
  label: string
  onChange: (isChecked: boolean) => void
}

export function ToggleSwitch({ isChecked, isDisabled = false, label, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      onClick={() => onChange(!isChecked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isChecked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          isChecked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
