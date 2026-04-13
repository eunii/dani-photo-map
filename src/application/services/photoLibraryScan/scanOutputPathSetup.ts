import type { ScanPhotoLibraryCommand } from '@application/dto/ScanPhotoLibraryCommand'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import { joinPathSegments, normalizePathSeparators } from '@shared/utils/path'

import type { ScanPathContext } from './photoLibraryScanTypes'
import { getScanErrorMessage } from './photoLibraryScanIssues'

export function createScanPathContext(
  command: ScanPhotoLibraryCommand
): ScanPathContext {
  return {
    sourceRoot: normalizePathSeparators(command.sourceRoot),
    outputRoot: normalizePathSeparators(command.outputRoot)
  }
}

export async function prepareOutputDirectories(
  outputRoot: string,
  fileSystem: PhotoLibraryFileSystemPort,
  rules: OrganizationRules
): Promise<void> {
  try {
    await fileSystem.ensureDirectory(outputRoot)
    await fileSystem.ensureDirectory(
      joinPathSegments(outputRoot, rules.outputThumbnailsRelativePath)
    )
  } catch (error) {
    throw new Error(
      `Failed to prepare output directories under ${outputRoot}: ${getScanErrorMessage(error)}`
    )
  }
}
