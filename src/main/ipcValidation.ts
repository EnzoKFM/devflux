import type { FeedbackRating, FeedbackReason, SourceCategory } from '@shared/contract'
import { parseHttpUrl } from './httpUrl'

const FEEDBACK_RATINGS: readonly FeedbackRating[] = ['like', 'dislike']
const FEEDBACK_REASONS: readonly FeedbackReason[] = ['off-topic', 'too-basic', 'already-seen', 'bad-source']
const SOURCE_CATEGORIES: readonly SourceCategory[] = ['web', 'software', 'general']

export function parseIdentifier(value: unknown, argumentName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Argument invalide : ${argumentName} doit être un entier strictement positif.`)
  }
  return value
}

export function parseBoolean(value: unknown, argumentName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Argument invalide : ${argumentName} doit être un booléen.`)
  }
  return value
}

export function parseRating(value: unknown): FeedbackRating {
  if (typeof value !== 'string' || !(FEEDBACK_RATINGS as readonly string[]).includes(value)) {
    throw new Error('Argument invalide : rating doit valoir "like" ou "dislike".')
  }
  return value as FeedbackRating
}

export function parseReason(value: unknown): FeedbackReason | null {
  if (value === null) {
    return null
  }
  if (typeof value !== 'string' || !(FEEDBACK_REASONS as readonly string[]).includes(value)) {
    throw new Error(`Argument invalide : reason doit être null ou l'une des valeurs ${FEEDBACK_REASONS.join(', ')}.`)
  }
  return value as FeedbackReason
}

export function parseCategory(value: unknown): SourceCategory {
  if (typeof value !== 'string' || !(SOURCE_CATEGORIES as readonly string[]).includes(value)) {
    throw new Error(`Argument invalide : category doit être l'une des valeurs ${SOURCE_CATEGORIES.join(', ')}.`)
  }
  return value as SourceCategory
}

export function parseHttpUrlArgument(value: unknown, argumentName: string): string {
  const parsedUrl = parseHttpUrl(value)
  if (!parsedUrl) {
    throw new Error(`Argument invalide : ${argumentName} doit être une URL http ou https.`)
  }
  return parsedUrl.href
}
