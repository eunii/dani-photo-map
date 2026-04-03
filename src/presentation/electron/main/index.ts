import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'
import { ScanPhotoLibraryUseCase } from '@application/usecases/ScanPhotoLibraryUseCase'
import { UpdatePhotoGroupUseCase } from '@application/usecases/UpdatePhotoGroupUseCase'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'
import { NodePhotoLibraryFileSystem } from '@infrastructure/filesystem/NodePhotoLibraryFileSystem'
import { CachedRegionResolver } from '@infrastructure/geo/CachedRegionResolver'
import { CuratedRegionResolver } from '@infrastructure/geo/CuratedRegionResolver'
import { FallbackRegionResolver } from '@infrastructure/geo/FallbackRegionResolver'
import { NodePhotoHasher } from '@infrastructure/hashing/NodePhotoHasher'
import { JsonLibraryIndexStore } from '@infrastructure/storage/JsonLibraryIndexStore'
import { SharpThumbnailGenerator } from '@infrastructure/thumbnails/SharpThumbnailGenerator'
import type {
  DirectorySelectionOptions,
  LibraryIndexView,
  LoadLibraryIndexRequest,
  ScanPhotoLibraryRequest
  ,
  UpdatePhotoGroupRequest
} from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  loadLibraryIndex: 'photo-app/load-library-index',
  scanPhotoLibrary: 'photo-app/scan-photo-library',
  updatePhotoGroup: 'photo-app/update-photo-group'
} as const

function createLibraryIndexStore(): JsonLibraryIndexStore {
  return new JsonLibraryIndexStore(defaultOrganizationRules.outputIndexRelativePath)
}

function createScanPhotoLibraryUseCase(command: ScanPhotoLibraryRequest) {
  const rules = defaultOrganizationRules
  const thumbnailsRootPath = join(
    command.outputRoot,
    rules.outputThumbnailsRelativePath
  )
  const regionResolver = new CachedRegionResolver(
    new CuratedRegionResolver(
      new FallbackRegionResolver(rules.unknownRegionLabel)
    )
  )

  return new ScanPhotoLibraryUseCase({
    fileSystem: new NodePhotoLibraryFileSystem(),
    metadataReader: new ExifrPhotoMetadataReader(),
    hasher: new NodePhotoHasher(),
    regionResolver,
    thumbnailGenerator: new SharpThumbnailGenerator(thumbnailsRootPath),
    libraryIndexStore: createLibraryIndexStore(),
    rules
  })
}

function createLoadLibraryIndexUseCase(): LoadLibraryIndexUseCase {
  return new LoadLibraryIndexUseCase(createLibraryIndexStore())
}

function createUpdatePhotoGroupUseCase(): UpdatePhotoGroupUseCase {
  return new UpdatePhotoGroupUseCase(createLibraryIndexStore())
}

function toLibraryIndexView(index: LibraryIndex): LibraryIndexView {
  const photosById = new Map(index.photos.map((photo) => [photo.id, photo]))

  return {
    generatedAt: index.generatedAt,
    outputRoot: index.outputRoot,
    groups: index.groups.map((group) => {
      const groupPhotos = group.photoIds
        .map((photoId) => photosById.get(photoId))
        .filter((photo) => photo !== undefined)

      return {
        id: group.id,
        groupKey: group.groupKey,
        title: group.title,
        displayTitle: group.displayTitle,
        photoCount: group.photoIds.length,
        photoIds: group.photoIds,
        representativePhotoId: group.representativePhotoId,
        representativeThumbnailRelativePath:
          group.representativeThumbnailRelativePath,
        representativeGps: group.representativeGps,
        companions: group.companions,
        notes: group.notes,
        photos: groupPhotos.map((photo) => ({
          id: photo.id,
          sourceFileName: photo.sourceFileName,
          capturedAtIso: photo.capturedAt?.iso,
          capturedAtSource: photo.capturedAtSource,
          thumbnailRelativePath: photo.thumbnailRelativePath,
          outputRelativePath: photo.outputRelativePath,
          hasGps: Boolean(photo.gps)
        }))
      }
    }),
    mapGroups: index.groups
      .filter((group) => group.representativeGps)
      .map((group) => ({
        id: group.id,
        title: group.title,
        photoCount: group.photoIds.length,
        latitude: group.representativeGps!.latitude,
        longitude: group.representativeGps!.longitude,
        representativeThumbnailRelativePath:
          group.representativeThumbnailRelativePath
      }))
  }
}

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
      const index = await useCase.execute(command)

      return index ? toLibraryIndexView(index) : null
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.scanPhotoLibrary)
  ipcMain.handle(
    IPC_CHANNELS.scanPhotoLibrary,
    async (_event, command: ScanPhotoLibraryRequest) => {
      const useCase = createScanPhotoLibraryUseCase(command)

      return useCase.execute(command)
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
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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