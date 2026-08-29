import { parentPort, workerData } from 'node:worker_threads'

import { SharpThumbnailGenerator } from '@infrastructure/thumbnails/SharpThumbnailGenerator'

export interface ThumbnailWorkerData {
  thumbnailsRootPath: string
}

export interface ThumbnailWorkerJob {
  id: number
  sourcePath: string
}

export interface ThumbnailWorkerResult {
  id: number
  fileName?: string
  errorMessage?: string
}

if (!parentPort) {
  throw new Error('generateThumbnailWorker must run inside a worker thread')
}

const { thumbnailsRootPath } = workerData as ThumbnailWorkerData
const generator = new SharpThumbnailGenerator(thumbnailsRootPath)

parentPort.on('message', (job: ThumbnailWorkerJob) => {
  generator
    .generateForPhoto(job.sourcePath)
    .then((fileName) => {
      const result: ThumbnailWorkerResult = { id: job.id, fileName }
      parentPort?.postMessage(result)
    })
    .catch((error: unknown) => {
      const result: ThumbnailWorkerResult = {
        id: job.id,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
      parentPort?.postMessage(result)
    })
})
