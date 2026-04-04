import type { ExistingOutputLibrarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'

/**
 * Maps output-relative paths to SHA-256 hex from a previously saved library index.
 * Used to avoid re-reading every output file when building the duplicate-detection set.
 */
export function sha256ByOutputRelativePathFromStoredIndex(
  storedIndex: LibraryIndex | null
): Map<string, string> {
  const map = new Map<string, string>()

  if (!storedIndex) {
    return map
  }

  for (const photo of storedIndex.photos) {
    const path = photo.outputRelativePath
    const hash = photo.sha256

    if (path && hash) {
      map.set(path, hash)
    }
  }

  return map
}

export interface BuildExistingOutputHashSetParams {
  snapshot: ExistingOutputLibrarySnapshot
  storedIndex: LibraryIndex | null
  hasher: Pick<PhotoHasherPort, 'createSha256'>
  onDiskHashFailure?: (context: {
    sourcePath: string
    photoId: string
    outputRelativePath: string
    error: unknown
  }) => void
}

/**
 * Builds the set of SHA-256 hashes for files already present under the output root.
 * Prefer hashes from `storedIndex` when `outputRelativePath` matches; otherwise hashes the file on disk.
 */
export async function buildExistingOutputHashSet(
  params: BuildExistingOutputHashSetParams
): Promise<Set<string>> {
  const { snapshot, storedIndex, hasher, onDiskHashFailure } = params
  const hashes = new Set<string>()
  const fromIndex = sha256ByOutputRelativePathFromStoredIndex(storedIndex)

  for (const existingPhoto of snapshot.photos) {
    const indexed = fromIndex.get(existingPhoto.outputRelativePath)

    if (indexed) {
      hashes.add(indexed)
      continue
    }

    try {
      hashes.add(await hasher.createSha256(existingPhoto.sourcePath))
    } catch (error) {
      onDiskHashFailure?.({
        sourcePath: existingPhoto.sourcePath,
        photoId: existingPhoto.id,
        outputRelativePath: existingPhoto.outputRelativePath,
        error
      })
    }
  }

  return hashes
}
