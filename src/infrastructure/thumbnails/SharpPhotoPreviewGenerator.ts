import sharp from 'sharp'

import type { PhotoPreviewPort } from '@application/ports/PhotoPreviewPort'
import { decodeHeicLikeToJpegBuffer } from '@infrastructure/thumbnails/decodeHeicLikeToJpegBuffer'
import {
  SHARP_IO_TIMEOUT_MS,
  SHARP_IO_TIMEOUT_SECONDS
} from '@shared/constants/ioTimeouts'
import { withTimeout } from '@shared/utils/withTimeout'

export class SharpPhotoPreviewGenerator implements PhotoPreviewPort {
  constructor(private readonly width = 480) {}

  async createDataUrl(sourcePath: string): Promise<string> {
    const buffer = await withTimeout(
      this.createResizedWebpBuffer(sourcePath),
      SHARP_IO_TIMEOUT_MS,
      `preview ${sourcePath}`
    )

    return `data:image/webp;base64,${buffer.toString('base64')}`
  }

  private async createResizedWebpBuffer(sourcePath: string): Promise<Buffer> {
    const heicJpegBuffer = await decodeHeicLikeToJpegBuffer(sourcePath)

    return sharp(heicJpegBuffer ?? sourcePath)
      .timeout({ seconds: SHARP_IO_TIMEOUT_SECONDS })
      .rotate()
      .resize({ width: this.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  }
}
