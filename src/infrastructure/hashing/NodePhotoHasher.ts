import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import type { PhotoHasherPort } from '@application/ports/PhotoHasherPort'
import { HASH_IO_TIMEOUT_MS } from '@shared/constants/ioTimeouts'
import { TimeoutError } from '@shared/utils/withTimeout'

export class NodePhotoHasher implements PhotoHasherPort {
  async createSha256(sourcePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash('sha256')
      const stream = createReadStream(sourcePath)
      let settled = false

      const settle = (callback: () => void): void => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timer)
        callback()
      }

      const timer = setTimeout(() => {
        stream.destroy()
        settle(() => {
          reject(
            new TimeoutError(
              `hash timed out after ${HASH_IO_TIMEOUT_MS}ms: ${sourcePath}`
            )
          )
        })
      }, HASH_IO_TIMEOUT_MS)

      stream.on('error', (error) => {
        settle(() => reject(error))
      })
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => {
        settle(() => resolve(hash.digest('hex')))
      })
    })
  }
}
