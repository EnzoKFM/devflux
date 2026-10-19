import { describe, expect, it } from 'vitest'
import { isFrenchText } from './languageDetection'

describe('isFrenchText', () => {
  it('reconnaît un titre en français, élisions comprises', () => {
    expect(isFrenchText('Optimiser les requêtes PostgreSQL avec des index')).toBe(true)
    expect(isFrenchText('La possession et l’emprunt en Rust expliqués')).toBe(true)
  })

  it('écarte un titre en anglais même s il contient un mot ambigu', () => {
    expect(isFrenchText('How we migrated our database to PostgreSQL')).toBe(false)
    expect(isFrenchText('Une API for the rest of us: what changed in the release')).toBe(false)
  })

  it('exige au moins deux mots outils français', () => {
    expect(isFrenchText('Liens intéressants Journal du hacker')).toBe(false)
    expect(isFrenchText('')).toBe(false)
  })
})
