import { pathToFileURL } from 'node:url'

import { ipcRenderer } from 'electron'

import type {
  PreloadBridge,
  ScanPhotoLibraryProgressPayload
} from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  loadLibraryIndex: 'photo-app/load-library-index',
  loadLibraryGroupDetail: 'photo-app/load-library-group-detail',
  previewPendingOrganization: 'photo-app/preview-pending-organization',
  scanPhotoLibrary: 'photo-app/scan-photo-library',
  scanPhotoLibraryProgress: 'photo-app/scan-photo-library-progress',
  updatePhotoGroup: 'photo-app/update-photo-group',
  movePhotosToGroup: 'photo-app/move-photos-to-group',
  deletePhotosFromLibrary: 'photo-app/delete-photos-from-library',
  deleteOutputFolderSubtree: 'photo-app/delete-output-folder-subtree'
} as const

export const preloadBridge: PreloadBridge = {
  async getAppInfo() {
    return {
      name: 'Dani Photo Map',
      version: '0.1.0'
    }
  },
  async ping() {
    return 'pong'
  },
  pathToFileUrl(absolutePath: string) {
    const trimmed = absolutePath.trim()

    if (!trimmed) {
      return ''
    }

    return pathToFileURL(trimmed).href
  },
  async selectDirectory(options) {
    return ipcRenderer.invoke(IPC_CHANNELS.selectDirectory, options)
  },
  async loadLibraryIndex(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.loadLibraryIndex, request)
  },
  async loadLibraryGroupDetail(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.loadLibraryGroupDetail, request)
  },
  async previewPendingOrganization(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.previewPendingOrganization, request)
  },
  async scanPhotoLibrary(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.scanPhotoLibrary, request)
  },
  onScanPhotoLibraryProgress(handler) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ScanPhotoLibraryProgressPayload
    ) => {
      handler(payload)
    }

    ipcRenderer.on(IPC_CHANNELS.scanPhotoLibraryProgress, listener)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.scanPhotoLibraryProgress, listener)
    }
  },
  async updatePhotoGroup(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.updatePhotoGroup, request)
  },
  async movePhotosToGroup(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.movePhotosToGroup, request)
  },
  async deletePhotosFromLibrary(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.deletePhotosFromLibrary, request)
  },
  async deleteOutputFolderSubtree(request) {
    return ipcRenderer.invoke(IPC_CHANNELS.deleteOutputFolderSubtree, request)
  },
  async invokePhotoApp(channel: string, payload: unknown) {
    if (typeof channel !== 'string' || !channel.startsWith('photo-app/')) {
      throw new Error('Invalid IPC channel')
    }
    return ipcRenderer.invoke(channel, payload)
  }
}
