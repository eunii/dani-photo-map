import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'

export class NodePhotoHasher implements PhotoHasherPort {
  async createSha256(sourcePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash('sha256')
      const stream = createReadStream(sourcePath)

      stream.on('error', reject)
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
    })
  }
}
