import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'

import { ScanPhotoLibraryUseCase } from '@application/usecases/ScanPhotoLibraryUseCase'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'
import { NodePhotoLibraryFileSystem } from '@infrastructure/filesystem/NodePhotoLibraryFileSystem'
import { FallbackRegionResolver } from '@infrastructure/geo/FallbackRegionResolver'
import { NodePhotoHasher } from '@infrastructure/hashing/NodePhotoHasher'
import { JsonLibraryIndexStore } from '@infrastructure/storage/JsonLibraryIndexStore'
import { SharpThumbnailGenerator } from '@infrastructure/thumbnails/SharpThumbnailGenerator'
import type {
  DirectorySelectionOptions,
  ScanPhotoLibraryRequest
} from '@shared/types/preload'

const IPC_CHANNELS = {
  selectDirectory: 'photo-app/select-directory',
  scanPhotoLibrary: 'photo-app/scan-photo-library'
} as const

function createScanPhotoLibraryUseCase(command: ScanPhotoLibraryRequest) {
  const rules = defaultOrganizationRules
  const thumbnailsRootPath = join(
    command.outputRoot,
    rules.outputThumbnailsRelativePath
  )

  return new ScanPhotoLibraryUseCase({
    fileSystem: new NodePhotoLibraryFileSystem(),
    metadataReader: new ExifrPhotoMetadataReader(),
    hasher: new NodePhotoHasher(),
    regionResolver: new FallbackRegionResolver(rules.unknownRegionLabel),
    thumbnailGenerator: new SharpThumbnailGenerator(thumbnailsRootPath),
    libraryIndexStore: new JsonLibraryIndexStore(rules.outputIndexRelativePath),
    rules
  })
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

  ipcMain.removeHandler(IPC_CHANNELS.scanPhotoLibrary)
  ipcMain.handle(
    IPC_CHANNELS.scanPhotoLibrary,
    async (_event, command: ScanPhotoLibraryRequest) => {
      const useCase = createScanPhotoLibraryUseCase(command)

      return useCase.execute(command)
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