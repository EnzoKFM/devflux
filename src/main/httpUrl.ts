export function parseHttpUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== 'string') {
    return null
  }
  try {
    const parsedUrl = new URL(rawUrl.trim())
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl : null
  } catch {
    return null
  }
}
