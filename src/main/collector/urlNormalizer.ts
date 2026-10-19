const TRACKING_PARAMETER_NAMES = new Set(['ref', 'fbclid', 'gclid'])
const TRACKING_PARAMETER_PREFIX = 'utm_'

function isTrackingParameter(parameterName: string): boolean {
  const lowerCaseName = parameterName.toLowerCase()
  return lowerCaseName.startsWith(TRACKING_PARAMETER_PREFIX) || TRACKING_PARAMETER_NAMES.has(lowerCaseName)
}

export function normalizeUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim()
  let parsedUrl: URL
  try {
    parsedUrl = new URL(trimmedUrl)
  } catch {
    return trimmedUrl
  }

  parsedUrl.hostname = parsedUrl.hostname.toLowerCase()
  parsedUrl.hash = ''

  const trackingParameterNames = [...parsedUrl.searchParams.keys()].filter(isTrackingParameter)
  for (const trackingParameterName of trackingParameterNames) {
    parsedUrl.searchParams.delete(trackingParameterName)
  }

  if (parsedUrl.pathname.length > 1) {
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '')
  }

  return parsedUrl.href
}
