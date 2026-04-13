import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndexStorePort } from '@application/ports/LibraryIndexStorePort'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import type { PhotoMetadataReaderPort } from '@application/ports/PhotoMetadataReaderPort'
import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type {
  ExistingOutputSkipDetail,
  InBatchDuplicateDetail,
  ScanPhotoLibraryIssue
} from '@application/dto/ScanPhotoLibraryResult'
import type { Photo } from '@domain/entities/Photo'

export interface ScanPhotoLibraryDependencies {
  fileSystem: PhotoLibraryFileSystemPort
  metadataReader: PhotoMetadataReaderPort
  hasher: PhotoHasherPort
  regionResolver: RegionResolverPort
  thumbnailGenerator: ThumbnailGeneratorPort
  libraryIndexStore: LibraryIndexStorePort
  existingOutputScanner: ExistingOutputScannerPort
  rules?: OrganizationRules
}

export interface ScanPathContext {
  sourceRoot: string
  outputRoot: string
}

export interface ScanPhotoContext {
  photoId: string
  sourcePath: string
  sourceFileName: string
  sourceFingerprint?: Photo['sourceFingerprint']
}

export interface PreparedPhotoRecord {
  photo: Photo
  context: ScanPhotoContext
}

export interface PreparedPhotoRecordResult {
  preparedPhotoRecord: PreparedPhotoRecord | null
  issues: ScanPhotoLibraryIssue[]
}

export interface FinalizedScanResult {
  copiedPhotos: Photo[]
  copiedCount: number
  duplicateCount: number
  skippedExistingCount: number
  inBatchDuplicateDetails: InBatchDuplicateDetail[]
  existingOutputSkipDetails: ExistingOutputSkipDetail[]
}
