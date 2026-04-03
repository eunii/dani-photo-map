import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'
import { PreviewPendingOrganizationUseCase } from '@application/usecases/PreviewPendingOrganizationUseCase'
import { ScanPhotoLibraryUseCase } from '@application/usecases/ScanPhotoLibraryUseCase'
import { UpdatePhotoGroupUseCase } from '@application/usecases/UpdatePhotoGroupUseCase'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { ExistingOutputLibraryScanner } from '@infrastructure/filesystem/ExistingOutputLibraryScanner'
import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'
import { NodePhotoLibraryFileSystem } from '@infrastructure/filesystem/NodePhotoLibraryFileSystem'
import { CachedRegionResolver } from '@infrastructure/geo/CachedRegionResolver'
import { CuratedRegionResolver } from '@infrastructure/geo/CuratedRegionResolver'
import { FallbackRegionResolver } from '@infrastructure/geo/FallbackRegionResolver'
import { NodePhotoHasher } from '@infrastructure/hashing/NodePhotoHasher'
import { JsonLibraryIndexStore } from '@infrastructure/storage/JsonLibraryIndexStore'
import { SharpThumbnailGenerator } from '@infrastructure/thumbnails/SharpThumbnailGenerator'
import { toLibraryIndexView } from '@presentation/common/mappers/toLibraryIndexView'
import type {
  DirectorySelectionOptions,
  LoadLibraryIndexRequest,
  PreviewPendingOrganizationRequest,
  ScanPhotoLibraryRequest,
  UpdatePhotoGroupRequest
} from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  loadLibraryIndex: 'photo-app/load-library-index',
  previewPendingOrganization: 'photo-app/preview-pending-organization',
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
    existingOutputScanner: new ExistingOutputLibraryScanner(rules),
    rules
  })
}

function createLoadLibraryIndexUseCase(): LoadLibraryIndexUseCase {
  return new LoadLibraryIndexUseCase(
    createLibraryIndexStore(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules)
  )
}

function createPreviewPendingOrganizationUseCase(): PreviewPendingOrganizationUseCase {
  const rules = defaultOrganizationRules

  return new PreviewPendingOrganizationUseCase({
    fileSystem: new NodePhotoLibraryFileSystem(),
    metadataReader: new ExifrPhotoMetadataReader(),
    hasher: new NodePhotoHasher(),
    regionResolver: new CachedRegionResolver(
      new CuratedRegionResolver(
        new FallbackRegionResolver(rules.unknownRegionLabel)
      )
    ),
    libraryIndexStore: createLibraryIndexStore(),
    existingOutputScanner: new ExistingOutputLibraryScanner(rules),
    rules
  })
}

function createUpdatePhotoGroupUseCase(): UpdatePhotoGroupUseCase {
  return new UpdatePhotoGroupUseCase(
    createLibraryIndexStore(),
    new NodePhotoLibraryFileSystem(),
    new ExistingOutputLibraryScanner(defaultOrganizationRules),
    defaultOrganizationRules
  )
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
      const result = await useCase.execute(command)

      return {
        source: result.source,
        index: result.index ? toLibraryIndexView(result.index) : null
      }
    }
  )

  ipcMain.removeHandler(IPC_CHANNELS.previewPendingOrganization)
  ipcMain.handle(
    IPC_CHANNELS.previewPendingOrganization,
    async (_event, command: PreviewPendingOrganizationRequest) => {
      const useCase = createPreviewPendingOrganizationUseCase()

      return useCase.execute(command)
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