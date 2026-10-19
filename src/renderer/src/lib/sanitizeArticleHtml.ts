import DOMPurify from 'dompurify'

const FORBIDDEN_TAGS = ['iframe', 'form', 'input', 'script', 'style']

export function sanitizeArticleHtml(articleHtml: string): string {
  return DOMPurify.sanitize(articleHtml, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    ALLOW_DATA_ATTR: false
  })
}
