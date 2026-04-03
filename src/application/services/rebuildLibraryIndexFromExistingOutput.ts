import type { ExistingOutputLibrarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'

export function rebuildLibraryIndexFromExistingOutput(
  snapshot: ExistingOutputLibrarySnapshot
): LibraryIndex | null {
  if (snapshot.photos.length === 0) {
    return null
  }

  const photos: Photo[] = snapshot.photos.map((photo) => ({
    id: photo.id,
    sourcePath: photo.sourcePath,
    sourceFileName: photo.sourceFileName,
    capturedAt: photo.capturedAt,
    regionName: photo.regionName,
    outputRelativePath: photo.outputRelativePath,
    isDuplicate: false,
    metadataIssues: ['recovered-from-output']
  }))

  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    sourceRoot: snapshot.outputRoot,
    outputRoot: snapshot.outputRoot,
    photos,
    groups: createPhotoGroups(photos)
  }
}
