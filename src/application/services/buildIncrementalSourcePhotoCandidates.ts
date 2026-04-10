import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { getPathBaseName, normalizePathSeparators } from '@shared/utils/path'
import { mapWithConcurrencyLimit } from '@shared/utils/mapWithConcurrencyLimit'

const INCREMENTAL_FINGERPRINT_CONCURRENCY_LIMIT = 8

export interface SourcePhotoFingerprint {
  sizeBytes: number
  modifiedAtMs: number
}

export interface SourcePhotoCandidate {
  sourcePath: string
  sourceFileName: string
  sourceFingerprint?: SourcePhotoFingerprint
}

interface IncrementalFingerprintReader {
  getPhotoFileFingerprint?: (
    absolutePath: string
  ) => Promise<SourcePhotoFingerprint | null>
}

export async function buildIncrementalSourcePhotoCandidates(params: {
  listedPhotoPaths: string[]
  sourceRoot: string
  storedIndex: LibraryIndex | null
  fileSystem: IncrementalFingerprintReader
}): Promise<{
  candidates: SourcePhotoCandidate[]
  skippedUnchangedCount: number
}> {
  const { fileSystem, listedPhotoPaths, sourceRoot, storedIndex } = params

  const normalizedSourceRoot = normalizePathSeparators(sourceRoot)
  const canUseIncremental =
    storedIndex?.sourceRoot === normalizedSourceRoot &&
    typeof fileSystem.getPhotoFileFingerprint === 'function'

  const storedFingerprintBySourcePath = new Map(
    (storedIndex?.photos ?? [])
      .filter((photo) => photo.sourceFingerprint)
      .map((photo) => [
        normalizePathSeparators(photo.sourcePath),
        photo.sourceFingerprint!
      ])
  )

  let skippedUnchangedCount = 0
  const candidates: SourcePhotoCandidate[] = []

  if (!canUseIncremental) {
    return {
      candidates: listedPhotoPaths.map((listedPhotoPath) => {
        const sourcePath = normalizePathSeparators(listedPhotoPath)

        return {
          sourcePath,
          sourceFileName: getPathBaseName(sourcePath)
        }
      }),
      skippedUnchangedCount: 0
    }
  }

  const results = await mapWithConcurrencyLimit(
    listedPhotoPaths,
    INCREMENTAL_FINGERPRINT_CONCURRENCY_LIMIT,
    async (listedPhotoPath) => {
      const sourcePath = normalizePathSeparators(listedPhotoPath)
      const sourceFileName = getPathBaseName(sourcePath)
      const currentFingerprint = await fileSystem.getPhotoFileFingerprint!(sourcePath)
      const storedFingerprint = storedFingerprintBySourcePath.get(sourcePath)
      const isUnchanged = Boolean(
        currentFingerprint &&
          storedFingerprint &&
          currentFingerprint.sizeBytes === storedFingerprint.sizeBytes &&
          currentFingerprint.modifiedAtMs === storedFingerprint.modifiedAtMs
      )

      return {
        sourcePath,
        sourceFileName,
        sourceFingerprint: currentFingerprint ?? undefined,
        isUnchanged
      }
    }
  )

  for (const result of results) {
    if (result.isUnchanged) {
      skippedUnchangedCount += 1
      continue
    }

    candidates.push({
      sourcePath: result.sourcePath,
      sourceFileName: result.sourceFileName,
      sourceFingerprint: result.sourceFingerprint
    })
  }

  return {
    candidates,
    skippedUnchangedCount
  }
}
