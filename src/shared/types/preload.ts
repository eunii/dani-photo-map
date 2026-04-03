export interface AppInfo {
  name: string
  version: string
}

export interface DirectorySelectionOptions {
  title: string
  buttonLabel: string
}

export interface ScanPhotoLibraryRequest {
  sourceRoot: string
  outputRoot: string
}

export interface ScanPhotoLibrarySummary {
  scannedCount: number
  duplicateCount: number
  keptCount: number
  groupCount: number
}

export interface PreloadBridge {
  getAppInfo: () => Promise<AppInfo>
  ping: () => Promise<string>
  selectDirectory: (
    options: DirectorySelectionOptions
  ) => Promise<string | null>
  scanPhotoLibrary: (
    request: ScanPhotoLibraryRequest
  ) => Promise<ScanPhotoLibrarySummary>
}
