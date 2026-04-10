import type { ExistingOutputLibrarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { mapWithConcurrencyLimit } from '@shared/utils/mapWithConcurrencyLimit'

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
  hashConcurrencyLimit?: number
  onDiskHashFailure?: (context: {
    sourcePath: string
    photoId: string
    outputRelativePath: string
    error: unknown
  }) => void
}

export interface BuildExistingOutputHashSetResult {
  hashes: Set<string>
  /** First output-relative path seen for each hash (for skip/compare UI). */
  hashToOutputRelativePath: Map<string, string>
}

function recordHash(
  hashes: Set<string>,
  hashToOutputRelativePath: Map<string, string>,
  hash: string,
  outputRelativePath: string
): void {
  hashes.add(hash)

  if (!hashToOutputRelativePath.has(hash)) {
    hashToOutputRelativePath.set(hash, outputRelativePath)
  }
}

/**
 * Builds the set of SHA-256 hashes for files already present under the output root.
 * Prefer hashes from `storedIndex` when `outputRelativePath` matches; otherwise hashes the file on disk.
 */
export async function buildExistingOutputHashSet(
  params: BuildExistingOutputHashSetParams
): Promise<BuildExistingOutputHashSetResult> {
  const {
    snapshot,
    storedIndex,
    hasher,
    hashConcurrencyLimit = 2,
    onDiskHashFailure
  } = params
  const hashes = new Set<string>()
  const hashToOutputRelativePath = new Map<string, string>()
  const fromIndex = sha256ByOutputRelativePathFromStoredIndex(storedIndex)

  const results = await mapWithConcurrencyLimit(
    snapshot.photos,
    hashConcurrencyLimit,
    async (existingPhoto) => {
      const indexed = fromIndex.get(existingPhoto.outputRelativePath)

      if (indexed) {
        return {
          kind: 'indexed' as const,
          outputRelativePath: existingPhoto.outputRelativePath,
          hash: indexed
        }
      }

      try {
        const hash = await hasher.createSha256(existingPhoto.sourcePath)
        return {
          kind: 'hashed' as const,
          outputRelativePath: existingPhoto.outputRelativePath,
          hash
        }
      } catch (error) {
        return {
          kind: 'failed' as const,
          sourcePath: existingPhoto.sourcePath,
          photoId: existingPhoto.id,
          outputRelativePath: existingPhoto.outputRelativePath,
          error
        }
      }
    }
  )

  for (const result of results) {
    if (result.kind === 'failed') {
      onDiskHashFailure?.({
        sourcePath: result.sourcePath,
        photoId: result.photoId,
        outputRelativePath: result.outputRelativePath,
        error: result.error
      })
      continue
    }

    recordHash(
      hashes,
      hashToOutputRelativePath,
      result.hash,
      result.outputRelativePath
    )
  }

  return { hashes, hashToOutputRelativePath }
}
