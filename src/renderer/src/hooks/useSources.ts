import { useState } from 'react'
import type { Source, SourceCategory } from '@shared/contract'
import { describeError } from '@renderer/lib/describeError'
import { describeSourcesImportReport } from '@renderer/lib/sourcesImportReport'
import { useAsyncResource } from './useAsyncResource'

export function useSources() {
  const sourcesResource = useAsyncResource(() => window.devflux.listSources(), 'sources')
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const [transferMessage, setTransferMessage] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const { updateValue: updateSources } = sourcesResource

  const toggleSourceEnabled = async (source: Source): Promise<void> => {
    const isEnabled = !source.isEnabled
    setActionErrorMessage(null)
    updateSources((sources) =>
      sources.map((currentSource) => (currentSource.id === source.id ? { ...currentSource, isEnabled } : currentSource))
    )
    try {
      await window.devflux.setSourceEnabled(source.id, isEnabled)
    } catch (error) {
      updateSources((sources) =>
        sources.map((currentSource) =>
          currentSource.id === source.id ? { ...currentSource, isEnabled: source.isEnabled } : currentSource
        )
      )
      setActionErrorMessage(`Impossible de modifier la source. (${describeError(error)})`)
    }
  }

  const removeSource = async (source: Source): Promise<void> => {
    setActionErrorMessage(null)
    try {
      await window.devflux.removeSource(source.id)
      updateSources((sources) => sources.filter((currentSource) => currentSource.id !== source.id))
    } catch (error) {
      setActionErrorMessage(`Impossible de supprimer la source. (${describeError(error)})`)
    }
  }

  const addSource = async (feedUrl: string, category: SourceCategory): Promise<Source> => {
    const addedSource = await window.devflux.addSource(feedUrl, category)
    updateSources((sources) => [...sources, addedSource])
    return addedSource
  }

  const importSourcesOpml = async (): Promise<void> => {
    setActionErrorMessage(null)
    setTransferMessage(null)
    setIsTransferring(true)
    try {
      const importReport = await window.devflux.importSourcesOpml()
      if (importReport === null) {
        return
      }
      const importedSources = await window.devflux.listSources()
      updateSources(() => importedSources)
      setTransferMessage(describeSourcesImportReport(importReport))
    } catch (error) {
      setActionErrorMessage(`Impossible d’importer les sources. (${describeError(error)})`)
    } finally {
      setIsTransferring(false)
    }
  }

  const exportSourcesOpml = async (): Promise<void> => {
    setActionErrorMessage(null)
    setTransferMessage(null)
    setIsTransferring(true)
    try {
      const isExported = await window.devflux.exportSourcesOpml()
      if (isExported) {
        setTransferMessage('Sources exportées.')
      }
    } catch (error) {
      setActionErrorMessage(`Impossible d’exporter les sources. (${describeError(error)})`)
    } finally {
      setIsTransferring(false)
    }
  }

  return {
    sourcesResource,
    actionErrorMessage,
    transferMessage,
    isTransferring,
    toggleSourceEnabled,
    removeSource,
    addSource,
    importSourcesOpml,
    exportSourcesOpml
  }
}
