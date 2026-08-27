import { createHash } from 'node:crypto'
import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname } from 'node:path'

import type {
  ExistingOutputGroupSummarySnapshot,
  ExistingOutputLibrarySnapshot,
  ExistingOutputPhotoSnapshot,
  ExistingOutputScannerPort
} from '@application/ports/ExistingOutputScannerPort'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'
import { isPhotoLibraryMediaFileName } from '@shared/constants/mediaExtensions'
import {
  getPathBaseName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'
import { isOrganizedOutputDirectorySegments } from '@shared/utils/organizedOutputPath'

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

function createRecoveredGroupId(pathSegments: string[]): string {
  return `fallback-group-${createHash('sha1')
    .update(pathSegments.join('/'))
    .digest('hex')}`
}

function extractFolderGroupingLabel(pathSegments: string[]): string | undefined {
  if (pathSegments.length < 2) {
    return undefined
  }

  if (pathSegments.length === 2) {
    return undefined
  }

  return decodeURIComponent(pathSegments[pathSegments.length - 1] ?? '')
}

function parseCapturedAtFromFileName(
  fileName: string
): PhotoTimestamp | undefined {
  const extension = extname(fileName)
  const baseName = extension
    ? fileName.slice(0, -extension.length)
    : fileName
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

function recoverSourceFileNameFromOutputFileName(outputFileName: string): string {
  const extension = extname(outputFileName)
  const baseName = extension
    ? outputFileName.slice(0, -extension.length)
    : outputFileName
  const match = baseName.match(RECOVERED_FILE_NAME_PATTERN)
  const recoveredBaseName = match?.[5]

  if (!recoveredBaseName) {
    return outputFileName
  }

  return `${recoveredBaseName}${extension}`
}

export class ExistingOutputLibraryScanner implements ExistingOutputScannerPort {
  constructor(
    private readonly rules: OrganizationRules = defaultOrganizationRules
  ) {}

  async scan(outputRoot: string): Promise<ExistingOutputLibrarySnapshot> {
    const groupSummaries = await this.scanGroupSummaries(outputRoot)
    const groups = await Promise.all(
      groupSummaries.map((group) =>
        this.scanGroupPhotos(outputRoot, group.pathSegments)
      )
    )

    return {
      outputRoot: normalizePathSeparators(outputRoot),
      photos: groups.flat().sort((left, right) =>
        left.outputRelativePath.localeCompare(right.outputRelativePath)
      )
    }
  }

  async scanGroupSummaries(
    outputRoot: string
  ): Promise<ExistingOutputGroupSummarySnapshot[]> {
    const normalizedOutputRoot = normalizePathSeparators(outputRoot)
    const groups: ExistingOutputGroupSummarySnapshot[] = []

    await this.collectGroupSummaries(normalizedOutputRoot, '', groups)

    return groups.sort((left, right) =>
      left.pathSegments.join('/').localeCompare(right.pathSegments.join('/'))
    )
  }

  async scanGroupPhotos(
    outputRoot: string,
    pathSegments: string[]
  ): Promise<ExistingOutputPhotoSnapshot[]> {
    const normalizedOutputRoot = normalizePathSeparators(outputRoot)
    const currentRelativePath = normalizePathSeparators(pathSegments.join('/'))
    const directoryEntries = await this.readDirectoryEntries(
      normalizedOutputRoot,
      currentRelativePath
    )
    const fileEntries = directoryEntries.filter(
      (entry) => entry.isFile() && isPhotoLibraryMediaFileName(entry.name)
    )

    return fileEntries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => {
        const outputRelativePath = currentRelativePath
          ? joinPathSegments(currentRelativePath, entry.name)
          : entry.name

        return this.toPhotoSnapshot(normalizedOutputRoot, outputRelativePath)
      })
  }

  private async collectGroupSummaries(
    outputRoot: string,
    currentRelativePath: string,
    groups: ExistingOutputGroupSummarySnapshot[]
  ): Promise<void> {
    const entries = await this.readDirectoryEntries(outputRoot, currentRelativePath)
    const photoFiles = entries
      .filter((entry) => entry.isFile() && isPhotoLibraryMediaFileName(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))
    const pathSegments = currentRelativePath
      ? currentRelativePath.split('/').filter((segment) => segment.length > 0)
      : []

    if (
      photoFiles.length > 0 &&
      isOrganizedOutputDirectorySegments(pathSegments)
    ) {
      const representativeFile = photoFiles[0]

      if (!representativeFile) {
        return
      }

      const representativeOutputRelativePath = currentRelativePath
        ? joinPathSegments(currentRelativePath, representativeFile.name)
        : representativeFile.name
      const timestamps = photoFiles
        .map((entry) => parseCapturedAtFromFileName(entry.name))
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .sort((left, right) => left.iso.localeCompare(right.iso))
      const regionLabel = decodeURIComponent(
        pathSegments[pathSegments.length - 1] ?? this.rules.unknownRegionLabel
      )

      groups.push({
        id: createRecoveredGroupId(pathSegments),
        groupKey: createRecoveredGroupId(pathSegments),
        pathSegments,
        title: regionLabel,
        displayTitle: regionLabel,
        photoCount: photoFiles.length,
        representativeOutputRelativePath,
        representativeSourceFileName: recoverSourceFileNameFromOutputFileName(
          representativeFile.name
        ),
        regionLabel,
        earliestCapturedAt: timestamps[0],
        latestCapturedAt: timestamps[timestamps.length - 1],
        searchText: [
          regionLabel,
          representativeFile.name,
          timestamps[0]?.iso ?? '',
          timestamps[timestamps.length - 1]?.iso ?? ''
        ]
          .join(' ')
          .toLocaleLowerCase()
          .trim()
      })
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const nextRelativePath = currentRelativePath
        ? joinPathSegments(currentRelativePath, entry.name)
        : entry.name

      if (entry.isDirectory()) {
        if (this.shouldSkipDirectory(nextRelativePath)) {
          continue
        }

        await this.collectGroupSummaries(
          outputRoot,
          nextRelativePath,
          groups
        )
      }
    }
  }

  private async readDirectoryEntries(
    outputRoot: string,
    currentRelativePath: string
  ): Promise<Dirent[]> {
    const directoryPath = currentRelativePath
      ? joinPathSegments(outputRoot, currentRelativePath)
      : outputRoot

    try {
      return await readdir(directoryPath, {
        withFileTypes: true,
        encoding: 'utf8'
      })
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return []
      }

      throw new Error(
        `Failed to scan existing output under ${outputRoot}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
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
    const outputFileName = getPathBaseName(normalizedOutputRelativePath)
    const sourceFileName = recoverSourceFileNameFromOutputFileName(outputFileName)
    const pathSegments = normalizedOutputRelativePath.split('/').filter(Boolean)
    const [year, month, regionName] = pathSegments
    const folderGroupingLabel = extractFolderGroupingLabel(pathSegments.slice(0, -1))

    return {
      id: createRecoveredPhotoId(normalizedOutputRelativePath),
      sourcePath: joinPathSegments(outputRoot, normalizedOutputRelativePath),
      sourceFileName,
      capturedAt: parseCapturedAtFromFileName(outputFileName),
      regionName:
        year && month && regionName
          ? decodeURIComponent(regionName)
          : this.rules.unknownRegionLabel,
      folderGroupingLabel,
      outputRelativePath: normalizedOutputRelativePath
    }
  }
}
