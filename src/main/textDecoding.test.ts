import { describe, expect, it } from 'vitest'
import {
  decodeResponseText,
  HTML_META_CHARSET_PATTERN,
  readContentTypeCharset,
  readMimeType,
  XML_DECLARATION_CHARSET_PATTERN
} from './textDecoding'

function createLatin1Response(text: string, contentType?: string): Response {
  return new Response(Buffer.from(text, 'latin1'), {
    status: 200,
    headers: contentType ? { 'Content-Type': contentType } : {}
  })
}

describe('readContentTypeCharset', () => {
  it('lit le charset, entre guillemets ou non, sans tenir compte de la casse', () => {
    expect(readContentTypeCharset('text/html; charset=ISO-8859-1')).toBe('ISO-8859-1')
    expect(readContentTypeCharset('text/html; Charset="utf-8"')).toBe('utf-8')
    expect(readContentTypeCharset('application/rss+xml')).toBeNull()
    expect(readContentTypeCharset(null)).toBeNull()
  })
})

describe('readMimeType', () => {
  it('ne garde que le type de média', () => {
    expect(readMimeType('application/rss+xml; charset=utf-8')).toBe('application/rss+xml')
    expect(readMimeType(null)).toBeNull()
  })
})

describe('decodeResponseText', () => {
  it('privilégie le charset de l en-tête HTTP', async () => {
    const response = createLatin1Response('<meta charset="utf-8">é', 'text/html; charset=iso-8859-1')

    expect(await decodeResponseText(response, HTML_META_CHARSET_PATTERN)).toContain('é')
  })

  it('lit la balise meta http-equiv quand l en-tête HTTP n indique rien', async () => {
    const response = createLatin1Response(
      '<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">é',
      'text/html'
    )

    expect(await decodeResponseText(response, HTML_META_CHARSET_PATTERN)).toContain('é')
  })

  it('lit l encodage de la déclaration XML', async () => {
    const response = createLatin1Response('<?xml version="1.0" encoding="ISO-8859-15"?><rss>€é</rss>'.replace('€', '¤'))

    expect(await decodeResponseText(response, XML_DECLARATION_CHARSET_PATTERN)).toContain('é')
  })

  it('retombe sur le charset du document quand celui de l en-tête HTTP est inconnu', async () => {
    const response = createLatin1Response('<meta charset="iso-8859-1">é', 'text/html; charset=latin-1')

    expect(await decodeResponseText(response, HTML_META_CHARSET_PATTERN)).toContain('é')
  })

  it('retombe sur utf-8 sans indication ou quand tous les labels sont inconnus', async () => {
    const utf8Response = new Response('<p>é</p>')
    const unknownLabelsResponse = new Response('<meta charset="inconnu"><p>é</p>', {
      headers: { 'Content-Type': 'text/html; charset=inconnu' }
    })

    expect(await decodeResponseText(utf8Response, HTML_META_CHARSET_PATTERN)).toBe('<p>é</p>')
    expect(await decodeResponseText(unknownLabelsResponse, HTML_META_CHARSET_PATTERN)).toContain('<p>é</p>')
  })
})
