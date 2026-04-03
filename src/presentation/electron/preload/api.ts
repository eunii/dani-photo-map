import { ipcRenderer } from 'electron'

import type { PreloadBridge } from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  loadLibraryIndex: 'photo-app/load-library-index',
  scanPhotoLibrary: 'photo-app/scan-photo-library',
  updatePhotoGroup: 'photo-app/update-photo-group'
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
  async loadLibraryIndex(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.loadLibraryIndex, request)
  },
  async scanPhotoLibrary(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.scanPhotoLibrary, request)
  },
  async updatePhotoGroup(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.updatePhotoGroup, request)
  }
}
