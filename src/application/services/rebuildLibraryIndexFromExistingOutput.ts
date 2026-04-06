import type { ExistingOutputLibrarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'

export function rebuildLibraryIndexFromExistingOutput(
  snapshot: ExistingOutputLibrarySnapshot,
  storedIndex: LibraryIndex | null = null
): LibraryIndex | null {
  if (snapshot.photos.length === 0) {
    return null
  }

  const storedPhotosByOutputRelativePath = new Map(
    (storedIndex?.photos ?? [])
      .filter((photo) => photo.outputRelativePath)
      .map((photo) => [photo.outputRelativePath!, photo] as const)
  )

  const photos: Photo[] = snapshot.photos.map((photo) => ({
    ...storedPhotosByOutputRelativePath.get(photo.outputRelativePath),
    id: photo.id,
    sourcePath: photo.sourcePath,
    sourceFileName: photo.sourceFileName,
    capturedAt:
      storedPhotosByOutputRelativePath.get(photo.outputRelativePath)?.capturedAt ??
      photo.capturedAt,
    regionName:
      storedPhotosByOutputRelativePath.get(photo.outputRelativePath)?.regionName ??
      photo.regionName,
    outputRelativePath: photo.outputRelativePath,
    isDuplicate: false,
    metadataIssues:
      storedPhotosByOutputRelativePath.get(photo.outputRelativePath)?.metadataIssues ??
      ['recovered-from-output']
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
