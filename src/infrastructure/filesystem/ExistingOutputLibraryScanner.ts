import { createHash } from 'node:crypto'
import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname } from 'node:path'

import type {
  ExistingOutputLibrarySnapshot,
  ExistingOutputPhotoSnapshot,
  ExistingOutputScannerPort
} from '@application/ports/ExistingOutputScannerPort'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'
import {
  getPathBaseName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

const PHOTO_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.webp'
])

const RECOVERED_FILE_NAME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{6})_(.+)$/i

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

function createRecoveredPhotoId(outputRelativePath: string): string {
  return `fallback-photo-${createHash('sha1')
    .update(outputRelativePath)
    .digest('hex')}`
}

function parseCapturedAtFromFileName(
  sourceFileName: string
): PhotoTimestamp | undefined {
  const extension = extname(sourceFileName)
  const baseName = extension
    ? sourceFileName.slice(0, -extension.length)
    : sourceFileName
  const match = baseName.match(RECOVERED_FILE_NAME_PATTERN)

  if (!match) {
    return undefined
  }

  const [, year, month, day, time] = match

  if (!year || !month || !day || !time) {
    return undefined
  }

  const iso = new Date(
    `${year}-${month}-${day}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}.000Z`
  )

  if (Number.isNaN(iso.getTime())) {
    return undefined
  }

  return {
    iso: iso.toISOString(),
    year,
    month,
    day,
    time
  }
}

export class ExistingOutputLibraryScanner implements ExistingOutputScannerPort {
  constructor(
    private readonly rules: OrganizationRules = defaultOrganizationRules
  ) {}

  async scan(outputRoot: string): Promise<ExistingOutputLibrarySnapshot> {
    const normalizedOutputRoot = normalizePathSeparators(outputRoot)
    const photoRelativePaths: string[] = []

    await this.collectPhotoRelativePaths(
      normalizedOutputRoot,
      '',
      photoRelativePaths
    )

    return {
      outputRoot: normalizedOutputRoot,
      photos: photoRelativePaths
        .sort()
        .map((outputRelativePath) =>
          this.toPhotoSnapshot(normalizedOutputRoot, outputRelativePath)
        )
    }
  }

  private async collectPhotoRelativePaths(
    outputRoot: string,
    currentRelativePath: string,
    photoRelativePaths: string[]
  ): Promise<void> {
    const directoryPath = currentRelativePath
      ? joinPathSegments(outputRoot, currentRelativePath)
      : outputRoot

    let entries: Dirent[]

    try {
      entries = await readdir(directoryPath, {
        withFileTypes: true,
        encoding: 'utf8'
      })
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return
      }

      throw new Error(
        `Failed to scan existing output under ${outputRoot}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const nextRelativePath = currentRelativePath
        ? joinPathSegments(currentRelativePath, entry.name)
        : entry.name

      if (entry.isDirectory()) {
        if (this.shouldSkipDirectory(nextRelativePath)) {
          continue
        }

        await this.collectPhotoRelativePaths(
          outputRoot,
          nextRelativePath,
          photoRelativePaths
        )
        continue
      }

      if (
        entry.isFile() &&
        PHOTO_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        photoRelativePaths.push(nextRelativePath)
      }
    }
  }

  private shouldSkipDirectory(relativePath: string): boolean {
    const normalizedRelativePath = normalizePathSeparators(relativePath)
    const organizerRoot = '.photo-organizer'

    return (
      normalizedRelativePath === organizerRoot ||
      normalizedRelativePath.startsWith(`${organizerRoot}/`)
    )
  }

  private toPhotoSnapshot(
    outputRoot: string,
    outputRelativePath: string
  ): ExistingOutputPhotoSnapshot {
    const normalizedOutputRelativePath = normalizePathSeparators(outputRelativePath)
    const sourceFileName = getPathBaseName(normalizedOutputRelativePath)
    const [year, month, regionName] = normalizedOutputRelativePath.split('/')

    return {
      id: createRecoveredPhotoId(normalizedOutputRelativePath),
      sourcePath: joinPathSegments(outputRoot, normalizedOutputRelativePath),
      sourceFileName,
      capturedAt: parseCapturedAtFromFileName(sourceFileName),
      regionName:
        year && month && regionName
          ? decodeURIComponent(regionName)
          : this.rules.unknownRegionLabel,
      outputRelativePath: normalizedOutputRelativePath
    }
  }
}
