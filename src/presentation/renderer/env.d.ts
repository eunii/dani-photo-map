/// <reference types="vite/client" />

import type { PreloadBridge } from '@shared/types/preload'

declare global {
  interface Window {
    photoApp: PreloadBridge
  }
}

export {}
