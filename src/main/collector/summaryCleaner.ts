export const SUMMARY_MAX_LENGTH = 280

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, entityName: string) => {
    if (entityName.startsWith('#')) {
      const codePoint =
        entityName[1].toLowerCase() === 'x' ? parseInt(entityName.slice(2), 16) : parseInt(entityName.slice(1), 10)
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return ' '
      }
    }
    return NAMED_ENTITIES[entityName.toLowerCase()] ?? entity
  })
}

export function cleanSummary(rawSummary: string | undefined): string | null {
  if (!rawSummary) {
    return null
  }
  const withoutTags = rawSummary
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
  const compactSummary = decodeEntities(withoutTags).replace(/\s+/g, ' ').trim()
  if (compactSummary.length === 0) {
    return null
  }
  if (compactSummary.length <= SUMMARY_MAX_LENGTH) {
    return compactSummary
  }
  return `${compactSummary.slice(0, SUMMARY_MAX_LENGTH - 1).trimEnd()}…`
}
