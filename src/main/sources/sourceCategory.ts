import type { SourceCategory } from '@shared/contract'

export const SOURCE_CATEGORIES: readonly SourceCategory[] = ['web', 'software', 'general']

export function isSourceCategory(value: unknown): value is SourceCategory {
  return typeof value === 'string' && (SOURCE_CATEGORIES as readonly string[]).includes(value)
}
