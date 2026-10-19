import { EXPLORATION_BADGE_DESCRIPTION, EXPLORATION_BADGE_LABEL } from '@renderer/lib/labels'

export function ExplorationBadge() {
  return (
    <span
      title={EXPLORATION_BADGE_DESCRIPTION}
      className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-medium text-amber-800"
    >
      {EXPLORATION_BADGE_LABEL}
      <span className="sr-only"> : {EXPLORATION_BADGE_DESCRIPTION}</span>
    </span>
  )
}
