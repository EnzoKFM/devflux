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

  it('écarte l espagnol, le portugais, l italien et l allemand malgré les mots outils partagés avec le français', () => {
    expect(isFrenchText('Qwen3-4B deslop corta las muletillas de IA de 121 a 12,5 por 1000 palabras')).toBe(false)
    expect(isFrenchText('O agente mudou as próprias regras. Quem aprovou a nova versão de la API?')).toBe(false)
    expect(isFrenchText('Le novità di Python per gli sviluppatori: la guida della release')).toBe(false)
    expect(isFrenchText('Die Neuerungen in Rust und das Ende der alten API für die Entwickler')).toBe(false)
  })

  it('exige au moins deux mots outils français', () => {
    expect(isFrenchText('Liens intéressants Journal du hacker')).toBe(false)
    expect(isFrenchText('')).toBe(false)
  })
})
