function withoutFragment(url: URL): string {
  const urlWithoutFragment = new URL(url.href)
  urlWithoutFragment.hash = ''
  return urlWithoutFragment.href
}

export function isNavigationAllowed(currentUrl: string, targetUrl: string): boolean {
  try {
    const parsedCurrentUrl = new URL(currentUrl)
    const parsedTargetUrl = new URL(targetUrl)
    if (parsedCurrentUrl.protocol === 'file:') {
      return parsedTargetUrl.protocol === 'file:' && withoutFragment(parsedCurrentUrl) === withoutFragment(parsedTargetUrl)
    }
    return parsedCurrentUrl.origin === parsedTargetUrl.origin
  } catch {
    return false
  }
}
