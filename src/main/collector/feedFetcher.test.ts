import { describe, expect, it } from 'vitest'
import { extractEntryFullContent } from './feedFetcher'

describe('extractEntryFullContent', () => {
  it('lit le contenu complet d une entrée RSS', () => {
    expect(extractEntryFullContent({ 'content:encoded': '<p>Article complet</p>' })).toBe('<p>Article complet</p>')
  })

  it('lit le contenu complet d une entrée Atom, texte simple ou nœud avec attributs', () => {
    expect(extractEntryFullContent({ content: 'Texte Atom' })).toBe('Texte Atom')
    expect(extractEntryFullContent({ content: { '@_type': 'html', '#text': '<p>Atom typé</p>' } })).toBe('<p>Atom typé</p>')
  })

  it('renvoie undefined sans contenu complet exploitable', () => {
    expect(extractEntryFullContent({ description: 'Résumé' })).toBeUndefined()
    expect(extractEntryFullContent({ content: { '@_src': 'https://ailleurs.example.com' } })).toBeUndefined()
  })
})
