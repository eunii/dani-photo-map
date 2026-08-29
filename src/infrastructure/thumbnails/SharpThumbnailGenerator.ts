import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'
import { decodeHeicLikeToJpegBuffer } from '@infrastructure/thumbnails/decodeHeicLikeToJpegBuffer'
import {
  SHARP_IO_TIMEOUT_MS,
  SHARP_IO_TIMEOUT_SECONDS
} from '@shared/constants/ioTimeouts'
import { withTimeout } from '@shared/utils/withTimeout'

export class SharpThumbnailGenerator implements ThumbnailGeneratorPort {
  constructor(
    private readonly thumbnailsRootPath: string,
    private readonly width = 480
  ) {}

  async generateForPhoto(sourcePath: string): Promise<string> {
    const fileName = this.createThumbnailFileName(sourcePath)
    const outputPath = join(this.thumbnailsRootPath, fileName)

    await mkdir(dirname(outputPath), { recursive: true })

    const heicJpegBuffer = await decodeHeicLikeToJpegBuffer(sourcePath)

    await withTimeout(
      sharp(heicJpegBuffer ?? sourcePath)
        .timeout({ seconds: SHARP_IO_TIMEOUT_SECONDS })
        .rotate()
        .resize({ width: this.width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outputPath),
      SHARP_IO_TIMEOUT_MS,
      `thumbnail ${sourcePath}`
    )

    return fileName.replace(/\\/g, '/')
  }

  private createThumbnailFileName(sourcePath: string): string {
    const normalizedPath = sourcePath.replace(/\\/g, '/')
    const safeBaseName = createHash('sha1').update(normalizedPath).digest('hex')

    return `${safeBaseName}.webp`
  }
}
