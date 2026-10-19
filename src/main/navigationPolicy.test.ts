import { describe, expect, it } from 'vitest'
import { isNavigationAllowed } from './navigationPolicy'

describe('isNavigationAllowed', () => {
  it('autorise la même origine en développement', () => {
    expect(isNavigationAllowed('http://localhost:5173/', 'http://localhost:5173/autre')).toBe(true)
    expect(isNavigationAllowed('http://localhost:5173/', 'https://example.com/')).toBe(false)
  })

  it('n autorise en production que le même document local', () => {
    expect(isNavigationAllowed('file:///app/index.html', 'file:///app/index.html#/favoris')).toBe(true)
    expect(isNavigationAllowed('file:///app/index.html', 'file:///etc/passwd')).toBe(false)
    expect(isNavigationAllowed('file:///app/index.html', 'https://example.com/')).toBe(false)
  })
})
