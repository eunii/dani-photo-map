import { ipcRenderer } from 'electron'

import type { PreloadBridge } from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  scanPhotoLibrary: 'photo-app/scan-photo-library'
} as const

export const preloadBridge: PreloadBridge = {
  async getAppInfo() {
    return {
      name: 'Photo Organizer',
      version: '0.1.0'
    }
  },
  async ping() {
    return 'pong'
  },
  async selectDirectory(options) {
    return ipcRenderer.invoke(IPC_CHANNELS.selectDirectory, options)
  },
  async scanPhotoLibrary(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.scanPhotoLibrary, request)
  }
}
