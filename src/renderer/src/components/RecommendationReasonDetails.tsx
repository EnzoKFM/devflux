import { useState } from 'react'
import type { RecommendationReason } from '@shared/contract'
import { describeRecommendationReason } from '@renderer/lib/recommendationReason'

interface RecommendationReasonDetailsProps {
  recommendationReason: RecommendationReason
  detailsId: string
}

export function RecommendationReasonDetails({ recommendationReason, detailsId }: RecommendationReasonDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const description = describeRecommendationReason(recommendationReason)

  return (
    <div className="px-4 pb-1 pl-8 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="text-slate-500 dark:text-slate-400 underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 hover:underline"
      >
        Pourquoi cet article ?
      </button>
      {isExpanded && (
        <ul id={detailsId} className="mt-1 flex flex-col gap-0.5 text-slate-600 dark:text-slate-400">
          {description.modeDescription && <li>{description.modeDescription}</li>}
          {description.closestTopicDescription && <li>{description.closestTopicDescription}</li>}
          <li>{description.dominantSignalDescription}</li>
        </ul>
      )}
    </div>
  )
}
