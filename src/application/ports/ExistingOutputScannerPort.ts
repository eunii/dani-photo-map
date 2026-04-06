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

export interface ExistingOutputGroupSummarySnapshot {
  id: string
  groupKey: string
  pathSegments: string[]
  title: string
  displayTitle: string
  photoCount: number
  representativeOutputRelativePath?: string
  representativeSourceFileName?: string
  regionLabel: string
  earliestCapturedAt?: PhotoTimestamp
  latestCapturedAt?: PhotoTimestamp
  searchText: string
}

export interface ExistingOutputScannerPort {
  scan(outputRoot: string): Promise<ExistingOutputLibrarySnapshot>
  scanGroupSummaries(outputRoot: string): Promise<ExistingOutputGroupSummarySnapshot[]>
  scanGroupPhotos(
    outputRoot: string,
    pathSegments: string[]
  ): Promise<ExistingOutputPhotoSnapshot[]>
}
