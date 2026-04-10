import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import { defaultMissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import {
  toFallbackGroupDetailView,
  toFallbackLibraryIndexView,
  toGroupDetailView,
  toLibraryIndexView
} from '@presentation/common/mappers/toLibraryIndexView'
import {
  createDeleteOutputFolderSubtreeUseCase,
  createDeletePhotosFromLibraryUseCase,
  createLoadLibraryGroupDetailUseCase,
  createLoadLibraryIndexUseCase,
  createMovePhotosToGroupUseCase,
  createPreviewPendingOrganizationUseCase,
  createScanPhotoLibraryUseCase,
  createUpdatePhotoGroupUseCase
} from '@presentation/electron/main/factories/createPhotoAppUseCases'
import type {
  DeleteOutputFolderSubtreeRequest,
  DeletePhotosFromLibraryRequest,
  DirectorySelectionOptions,
  LoadLibraryGroupDetailRequest,
  LoadLibraryIndexRequest,
  MovePhotosToGroupRequest,
  PreviewPendingOrganizationRequest,
  ScanPhotoLibraryRequest,
  UpdatePhotoGroupRequest
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

function registerIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.selectDirectory)
  ipcMain.handle(
    IPC_CHANNELS.selectDirectory,
    async (_event, options: DirectorySelectionOptions) => {
      const result = await dialog.showOpenDialog({
        title: options.title,
        buttonLabel: options.buttonLabel,
        properties: ['openDirectory', 'createDirectory']
      })

      return result.canceled ? null : (result.filePaths[0] ?? null)
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.loadLibraryIndex)
  ipcMain.handle(
    IPC_CHANNELS.loadLibraryIndex,
    async (_event, command: LoadLibraryIndexRequest) => {
      const useCase = createLoadLibraryIndexUseCase()
      const result = await useCase.execute({
        ...command,
        mode: command.mode ?? 'default'
      })

      return {
        source: result.source,
        index: result.index
          ? toLibraryIndexView(result.index)
          : result.fallbackGroups
            ? toFallbackLibraryIndexView(
                command.outputRoot,
                new Date().toISOString(),
                result.fallbackGroups
              )
            : null
      }
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.loadLibraryGroupDetail)
  ipcMain.handle(
    IPC_CHANNELS.loadLibraryGroupDetail,
    async (_event, command: LoadLibraryGroupDetailRequest) => {
      const useCase = createLoadLibraryGroupDetailUseCase()
      const result = await useCase.execute(command)

      if (result.index && result.group) {
        const photosById = new Map(
          result.index.photos.map((photo) => [photo.id, photo] as const)
        )

        return {
          group: toGroupDetailView(result.group, photosById)
        }
      }

      return {
        group: result.fallbackPhotos
          ? toFallbackGroupDetailView(
              command.groupId,
              result.pathSegments,
              result.fallbackPhotos
            )
          : null
      }
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.previewPendingOrganization)
  ipcMain.handle(
    IPC_CHANNELS.previewPendingOrganization,
    async (_event, command: PreviewPendingOrganizationRequest) => {
      const useCase = createPreviewPendingOrganizationUseCase()

      return useCase.execute({
        ...command,
        missingGpsGroupingBasis:
          command.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
      })
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.scanPhotoLibrary)
  ipcMain.handle(
    IPC_CHANNELS.scanPhotoLibrary,
    async (event, command: ScanPhotoLibraryRequest) => {
      const useCase = createScanPhotoLibraryUseCase(command)

      return useCase.execute({
        ...command,
        missingGpsGroupingBasis:
          command.missingGpsGroupingBasis ?? defaultMissingGpsGroupingBasis
      }, {
        onScanProgress: (payload) => {
          event.sender.send(IPC_CHANNELS.scanPhotoLibraryProgress, payload)
        }
      })
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.updatePhotoGroup)
  ipcMain.handle(
    IPC_CHANNELS.updatePhotoGroup,
    async (_event, command: UpdatePhotoGroupRequest) => {
      const useCase = createUpdatePhotoGroupUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.movePhotosToGroup)
  ipcMain.handle(
    IPC_CHANNELS.movePhotosToGroup,
    async (_event, command: MovePhotosToGroupRequest) => {
      const useCase = createMovePhotosToGroupUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.deletePhotosFromLibrary)
  ipcMain.handle(
    IPC_CHANNELS.deletePhotosFromLibrary,
    async (_event, command: DeletePhotosFromLibraryRequest) => {
      const useCase = createDeletePhotosFromLibraryUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.deleteOutputFolderSubtree)
  ipcMain.handle(
    IPC_CHANNELS.deleteOutputFolderSubtree,
    async (_event, command: DeleteOutputFolderSubtreeRequest) => {
      const useCase = createDeleteOutputFolderSubtreeUseCase()
      const index = await useCase.execute(command)

      return toLibraryIndexView(index)
    }
  )
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: 'Dani Photo Map',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})