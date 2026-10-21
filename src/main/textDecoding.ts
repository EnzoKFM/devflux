export const DEFAULT_CHARSET = 'utf-8'
export const CHARSET_SNIFF_BYTE_COUNT = 4096
export const XML_DECLARATION_CHARSET_PATTERN = /<\?xml[^>]*?\bencoding\s*=\s*["']([^"']+)["']/i
export const HTML_META_CHARSET_PATTERN = /<meta[^>]+?charset\s*=\s*["']?\s*([^\s"';>/]+)/i

export function readMimeType(contentType: string | null): string | null {
  const mimeType = contentType?.split(';')[0].trim()
  return mimeType ? mimeType : null
}

export function readContentTypeCharset(contentType: string | null): string | null {
  return /;\s*charset\s*=\s*["']?\s*([^\s"';]+)/i.exec(contentType ?? '')?.[1] ?? null
}

export function readDocumentCharset(documentBytes: Uint8Array, documentCharsetPattern: RegExp): string | null {
  const documentStart = new TextDecoder('latin1').decode(documentBytes.subarray(0, CHARSET_SNIFF_BYTE_COUNT))
  return documentCharsetPattern.exec(documentStart)?.[1] ?? null
}

function isSupportedCharset(charset: string | null): charset is string {
  if (charset === null) {
    return false
  }
  try {
    new TextDecoder(charset)
    return true
  } catch {
    return false
  }
}

export async function decodeResponseText(response: Response, documentCharsetPattern: RegExp): Promise<string> {
  const responseBytes = new Uint8Array(await response.arrayBuffer())
  const headerCharset = readContentTypeCharset(response.headers.get('content-type'))
  const documentCharset = readDocumentCharset(responseBytes, documentCharsetPattern)
  const charset = [headerCharset, documentCharset].find(isSupportedCharset) ?? DEFAULT_CHARSET
  return new TextDecoder(charset).decode(responseBytes)
}
