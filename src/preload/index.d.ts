import type { DevFluxApi } from '../shared/contract'

declare global {
  interface Window {
    devflux: DevFluxApi
  }
}
