import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export interface ExistingOutputPhotoSnapshot {
  id: string
  sourcePath: string
  sourceFileName: string
  capturedAt?: PhotoTimestamp
  regionName?: string
  outputRelativePath: string
}

export interface ExistingOutputLibrarySnapshot {
  outputRoot: string
  photos: ExistingOutputPhotoSnapshot[]
}

export interface ExistingOutputScannerPort {
  scan(outputRoot: string): Promise<ExistingOutputLibrarySnapshot>
}
