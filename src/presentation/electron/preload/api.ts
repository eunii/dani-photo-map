import { pathToFileURL } from 'node:url'

import { ipcRenderer } from 'electron'

import {
  photoAppEventChannels,
  photoAppInvokeChannels,
  type PhotoAppInvokeChannel
} from '@shared/ipc/photoAppChannels'
import type {
  OrganizeJobStatus,
  PhotoAppInvokeRequestMap,
  PhotoAppInvokeResponseMap,
  PreloadBridge,
  ScanPhotoLibraryProgressPayload
} from '@shared/types/preload'

const ALLOWED_INVOKE_CHANNELS = new Set<string>(Object.values(photoAppInvokeChannels))

export const preloadBridge: PreloadBridge = {
  pathToFileUrl(absolutePath: string) {
    const trimmed = absolutePath.trim()

    if (!trimmed) {
      return ''
    }

    return pathToFileURL(trimmed).href
  },
  async selectDirectory(options) {
    return ipcRenderer.invoke(photoAppInvokeChannels.selectDirectory, options)
  },
  async loadLibraryIndex(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.loadLibraryIndex, request)
  },
  async loadLibraryGroupDetail(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.loadLibraryGroupDetail, request)
  },
  async previewPendingOrganization(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.previewPendingOrganization, request)
  },
  async startOrganizeJob(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.startOrganizeJob, request)
  },
  async getOrganizeJobStatus() {
    return ipcRenderer.invoke(photoAppInvokeChannels.getOrganizeJobStatus)
  },
  async cancelOrganizeJob() {
    return ipcRenderer.invoke(photoAppInvokeChannels.cancelOrganizeJob)
  },
  async scanPhotoLibrary(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.scanPhotoLibrary, request)
  },
  onScanPhotoLibraryProgress(handler) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ScanPhotoLibraryProgressPayload
    ) => {
      handler(payload)
    }

    ipcRenderer.on(photoAppEventChannels.scanPhotoLibraryProgress, listener)

    return () => {
      ipcRenderer.removeListener(photoAppEventChannels.scanPhotoLibraryProgress, listener)
    }
  },
  onOrganizeJobStatusChanged(handler) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: OrganizeJobStatus
    ) => {
      handler(payload)
    }

    ipcRenderer.on(photoAppEventChannels.organizeJobStatusChanged, listener)

    return () => {
      ipcRenderer.removeListener(
        photoAppEventChannels.organizeJobStatusChanged,
        listener
      )
    }
  },
  async updatePhotoGroup(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.updatePhotoGroup, request)
  },
  async movePhotosToGroup(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.movePhotosToGroup, request)
  },
  async deletePhotosFromLibrary(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.deletePhotosFromLibrary, request)
  },
  async deleteOutputFolderSubtree(request) {
    return ipcRenderer.invoke(photoAppInvokeChannels.deleteOutputFolderSubtree, request)
  },
  async invokePhotoApp<TChannel extends PhotoAppInvokeChannel>(
    channel: TChannel,
    payload: PhotoAppInvokeRequestMap[TChannel]
  ): Promise<PhotoAppInvokeResponseMap[TChannel]> {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      throw new Error('Invalid IPC channel')
    }
    return ipcRenderer.invoke(channel, payload)
  }
}
