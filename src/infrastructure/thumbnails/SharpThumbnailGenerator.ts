import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'

export class SharpThumbnailGenerator implements ThumbnailGeneratorPort {
  constructor(
    private readonly thumbnailsRootPath: string,
    private readonly width = 480
  ) {}

  async generateForPhoto(sourcePath: string): Promise<string> {
    const fileName = this.createThumbnailFileName(sourcePath)
    const outputPath = join(this.thumbnailsRootPath, fileName)

    await mkdir(dirname(outputPath), { recursive: true })
    await sharp(sourcePath)
      .rotate()
      .resize({ width: this.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath)

    return fileName.replace(/\\/g, '/')
  }

  private createThumbnailFileName(sourcePath: string): string {
    const normalizedPath = sourcePath.replace(/\\/g, '/')
    const safeBaseName = createHash('sha1').update(normalizedPath).digest('hex')

    return `${safeBaseName}.webp`
  }
}
