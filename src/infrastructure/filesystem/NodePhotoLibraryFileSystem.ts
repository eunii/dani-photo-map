import { constants } from 'node:fs'
import { access, copyFile, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

import {
  PhotoFileConflictError,
  type PhotoLibraryFileSystemPort
} from '@application/ports/PhotoLibraryFileSystemPort'
import { normalizePathSeparators } from '@shared/utils/path'

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

export class NodePhotoLibraryFileSystem implements PhotoLibraryFileSystemPort {
  async listPhotoFiles(rootPath: string): Promise<string[]> {
    const photoFiles: string[] = []

    await this.collectPhotoFiles(rootPath, photoFiles)

    return photoFiles
      .map((photoPath) => normalizePathSeparators(photoPath))
      .sort()
  }

  async listDirectoryFileNames(directoryPath: string): Promise<string[]> {
    try {
      const entries = await readdir(normalize(directoryPath), {
        withFileTypes: true
      })

      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort()
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return []
      }

      throw error
    }
  }

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(normalize(path), { recursive: true })
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await copyFile(
        normalize(sourcePath),
        normalize(destinationPath),
        constants.COPYFILE_EXCL
      )
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'EEXIST'
      ) {
        throw new PhotoFileConflictError(destinationPath)
      }

      throw error
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    const normalizedSourcePath = normalize(sourcePath)
    const normalizedDestinationPath = normalize(destinationPath)

    if (normalizedSourcePath === normalizedDestinationPath) {
      return
    }

    try {
      await access(normalizedDestinationPath)
      throw new PhotoFileConflictError(destinationPath)
    } catch (error) {
      if (
        error instanceof PhotoFileConflictError ||
        !(
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
      ) {
        throw error
      }
    }

    await rename(normalizedSourcePath, normalizedDestinationPath)
  }

  async removeFileIfExists(absolutePath: string): Promise<void> {
    try {
      await rm(normalize(absolutePath), { force: true })
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return
      }
      throw error
    }
  }

  async removeDirectoryRecursiveIfExists(absolutePath: string): Promise<void> {
    try {
      await rm(normalize(absolutePath), { recursive: true, force: true })
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return
      }
      throw error
    }
  }

  private async collectPhotoFiles(
    directoryPath: string,
    photoFiles: string[]
  ): Promise<void> {
    const entries = await readdir(directoryPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        await this.collectPhotoFiles(fullPath, photoFiles)
        continue
      }

      if (entry.isFile() && PHOTO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        photoFiles.push(fullPath)
      }
    }
  }
}
