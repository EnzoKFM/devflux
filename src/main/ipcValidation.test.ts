import { describe, expect, it } from 'vitest'
import {
  parseBoolean,
  parseCategory,
  parseHttpUrlArgument,
  parseIdentifier,
  parseRating,
  parseReason
} from './ipcValidation'

describe('validation des arguments IPC', () => {
  it('n accepte que des identifiants entiers strictement positifs', () => {
    expect(parseIdentifier(12, 'articleId')).toBe(12)
    for (const invalidIdentifier of [0, -1, 1.5, '3', null, undefined, Number.NaN, Infinity]) {
      expect(() => parseIdentifier(invalidIdentifier, 'articleId')).toThrow('articleId')
    }
  })

  it('n accepte que de vrais booléens', () => {
    expect(parseBoolean(false, 'isEnabled')).toBe(false)
    expect(() => parseBoolean('true', 'isEnabled')).toThrow('isEnabled')
  })

  it('valide les énumérations', () => {
    expect(parseRating('like')).toBe('like')
    expect(() => parseRating('love')).toThrow()
    expect(parseReason(null)).toBeNull()
    expect(parseReason('too-basic')).toBe('too-basic')
    expect(() => parseReason('autre')).toThrow()
    expect(() => parseReason(undefined)).toThrow()
    expect(parseCategory('software')).toBe('software')
    expect(() => parseCategory('news')).toThrow()
  })

  it('n accepte que des URL http ou https', () => {
    expect(parseHttpUrlArgument('https://example.com/a', 'url')).toBe('https://example.com/a')
    for (const invalidUrl of ['file:///etc/passwd', 'javascript:alert(1)', 'example.com', 42, null]) {
      expect(() => parseHttpUrlArgument(invalidUrl, 'url')).toThrow('url')
    }
  })
})
