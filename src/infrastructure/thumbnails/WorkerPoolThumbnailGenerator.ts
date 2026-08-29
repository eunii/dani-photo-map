import { Worker } from 'node:worker_threads'

import type { ThumbnailGeneratorPort } from '@application/ports/ThumbnailGeneratorPort'
import type {
  ThumbnailWorkerJob,
  ThumbnailWorkerResult
} from '@presentation/electron/main/workers/generateThumbnailWorker'

interface PendingJob {
  resolve: (fileName: string) => void
  reject: (error: Error) => void
}

interface PoolWorker {
  worker: Worker
  busy: boolean
}

/**
 * Runs HEIC decode + sharp resize on `worker_threads` instead of the Electron
 * main thread, so backfilling many HEIC thumbnails at once doesn't freeze the
 * app (IPC/window responsiveness) while the decode work runs.
 */
export class WorkerPoolThumbnailGenerator implements ThumbnailGeneratorPort {
  private readonly pool: PoolWorker[] = []
  private readonly queue: Array<{ job: ThumbnailWorkerJob; pending: PendingJob }> = []
  private readonly pendingById = new Map<number, PendingJob>()
  private nextJobId = 0
  private disposed = false

  constructor(
    private readonly thumbnailsRootPath: string,
    private readonly poolSize = 2
  ) {}

  async generateForPhoto(sourcePath: string): Promise<string> {
    if (this.disposed) {
      throw new Error('WorkerPoolThumbnailGenerator has been disposed')
    }

    this.ensureWorkersStarted()

    return new Promise<string>((resolve, reject) => {
      const job: ThumbnailWorkerJob = { id: this.nextJobId++, sourcePath }
      const pending: PendingJob = { resolve, reject }
      this.pendingById.set(job.id, pending)
      this.queue.push({ job, pending })
      this.dispatchNext()
    })
  }

  async dispose(): Promise<void> {
    this.disposed = true
    await Promise.all(this.pool.map(({ worker }) => worker.terminate()))
    this.pool.length = 0
  }

  private ensureWorkersStarted(): void {
    if (this.pool.length > 0) {
      return
    }

    // Bundled sibling of the running main-process entry file (see
    // `electron.vite.config.ts`'s `main.build` multi-entry setup) — NOT the
    // source-tree-relative path, since this module ends up bundled into the
    // main entry chunk rather than kept as its own file.
    const workerUrl = new URL('./generateThumbnailWorker.js', import.meta.url)

    for (let index = 0; index < this.poolSize; index += 1) {
      const worker = new Worker(workerUrl, {
        workerData: { thumbnailsRootPath: this.thumbnailsRootPath }
      })
      const poolWorker: PoolWorker = { worker, busy: false }

      worker.on('message', (result: ThumbnailWorkerResult) => {
        poolWorker.busy = false
        const pending = this.pendingById.get(result.id)
        this.pendingById.delete(result.id)

        if (pending) {
          if (result.errorMessage) {
            pending.reject(new Error(result.errorMessage))
          } else if (result.fileName) {
            pending.resolve(result.fileName)
          } else {
            pending.reject(new Error('썸네일 워커가 결과를 반환하지 않았습니다.'))
          }
        }

        this.dispatchNext()
      })

      worker.on('error', (error) => {
        poolWorker.busy = false
        for (const [id, pending] of this.pendingById) {
          this.pendingById.delete(id)
          pending.reject(error instanceof Error ? error : new Error(String(error)))
        }
        this.dispatchNext()
      })

      this.pool.push(poolWorker)
    }
  }

  private dispatchNext(): void {
    if (this.queue.length === 0) {
      return
    }

    const idleWorker = this.pool.find((poolWorker) => !poolWorker.busy)
    if (!idleWorker) {
      return
    }

    const next = this.queue.shift()
    if (!next) {
      return
    }

    idleWorker.busy = true
    idleWorker.worker.postMessage(next.job)
  }
}
