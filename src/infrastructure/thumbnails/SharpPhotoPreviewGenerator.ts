import sharp from 'sharp'

import type { PhotoPreviewPort } from '@application/ports/PhotoPreviewPort'

export class SharpPhotoPreviewGenerator implements PhotoPreviewPort {
  constructor(private readonly width = 480) {}

  async createDataUrl(sourcePath: string): Promise<string> {
    const buffer = await sharp(sourcePath)
      .rotate()
      .resize({ width: this.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    return `data:image/webp;base64,${buffer.toString('base64')}`
  }
}
