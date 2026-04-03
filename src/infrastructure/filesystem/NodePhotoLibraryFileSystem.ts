import { cp, mkdir, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'

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

    return photoFiles.sort()
  }

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true })
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    await cp(sourcePath, destinationPath)
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
