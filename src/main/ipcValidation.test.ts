import { describe, expect, it } from 'vitest'
import {
  parseBoolean,
  parseCategory,
  parseHttpUrlArgument,
  parseIdentifier,
  parseRating,
  parseReason,
  parseTopicId,
  parseTopicIds,
  parseTopicPreference
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

  it('n accepte que des identifiants de sujets du catalogue', () => {
    expect(parseTopicId('rust', 'topicId')).toBe('rust')
    for (const invalidTopicId of ['inconnu', '', 3, null, undefined, { id: 'rust' }]) {
      expect(() => parseTopicId(invalidTopicId, 'topicId')).toThrow('topicId')
    }
    expect(parseTopicIds(['rust', 'security'], 'followedTopicIds')).toEqual(['rust', 'security'])
    expect(parseTopicIds([], 'followedTopicIds')).toEqual([])
    expect(() => parseTopicIds(['rust', 'inconnu'], 'followedTopicIds')).toThrow('followedTopicIds')
    expect(() => parseTopicIds('rust', 'followedTopicIds')).toThrow('followedTopicIds')
    expect(() => parseTopicIds(Array(500).fill('rust'), 'followedTopicIds')).toThrow('followedTopicIds')
  })

  it('valide les préférences de sujet', () => {
    expect(parseTopicPreference('followed')).toBe('followed')
    expect(parseTopicPreference('neutral')).toBe('neutral')
    expect(parseTopicPreference('muted')).toBe('muted')
    for (const invalidPreference of ['autre', '', null, undefined, 1]) {
      expect(() => parseTopicPreference(invalidPreference)).toThrow('preference')
    }
  })
})
