import { describeAffinity } from '@renderer/lib/affinity'

interface AffinityGaugeProps {
  affinity: number
}

export function AffinityGauge({ affinity }: AffinityGaugeProps) {
  const { tone, strengthPercentage, label } = describeAffinity(affinity)
  const halfWidthPercentage = strengthPercentage / 2

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className="relative h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
      {tone === 'positive' && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 bg-emerald-500"
          style={{ width: `${halfWidthPercentage}%` }}
        />
      )}
      {tone === 'negative' && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-1/2 bg-rose-500"
          style={{ width: `${halfWidthPercentage}%` }}
        />
      )}
    </div>
  )
}
