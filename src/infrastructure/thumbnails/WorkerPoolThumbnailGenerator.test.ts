import { describe, expect, it, vi } from 'vitest'

import { WorkerPoolThumbnailGenerator } from '@infrastructure/thumbnails/WorkerPoolThumbnailGenerator'

interface FakeWorkerInstance {
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
  emit(event: string, payload: unknown): void
}

const { createdWorkers, FakeWorker } = vi.hoisted(() => {
  const createdWorkers: FakeWorkerInstance[] = []

  class FakeWorker implements FakeWorkerInstance {
    private readonly listeners: Record<string, ((payload: unknown) => void)[]> = {}
    postMessage = vi.fn()
    terminate = vi.fn().mockResolvedValue(undefined)

    constructor() {
      createdWorkers.push(this)
    }

    on(event: string, handler: (payload: unknown) => void): this {
      const handlers = this.listeners[event] ?? []
      handlers.push(handler)
      this.listeners[event] = handlers
      return this
    }

    emit(event: string, payload: unknown): void {
      for (const handler of this.listeners[event] ?? []) {
        handler(payload)
      }
    }
  }

  return { createdWorkers, FakeWorker }
})

vi.mock('node:worker_threads', () => ({
  Worker: FakeWorker
}))

describe('WorkerPoolThumbnailGenerator', () => {
  it('dispatches jobs to idle workers and resolves by matching id', async () => {
    createdWorkers.length = 0
    const generator = new WorkerPoolThumbnailGenerator('C:/out/thumbs', 2)

    const promise1 = generator.generateForPhoto('C:/photos/a.jpg')
    const promise2 = generator.generateForPhoto('C:/photos/b.jpg')

    expect(createdWorkers).toHaveLength(2)
    expect(createdWorkers[0]?.postMessage).toHaveBeenCalledWith({
      id: 0,
      sourcePath: 'C:/photos/a.jpg'
    })
    expect(createdWorkers[1]?.postMessage).toHaveBeenCalledWith({
      id: 1,
      sourcePath: 'C:/photos/b.jpg'
    })

    createdWorkers[0]?.emit('message', { id: 0, fileName: 'a.webp' })
    createdWorkers[1]?.emit('message', { id: 1, fileName: 'b.webp' })

    await expect(promise1).resolves.toBe('a.webp')
    await expect(promise2).resolves.toBe('b.webp')
  })

  it('queues a third job until a worker frees up', async () => {
    createdWorkers.length = 0
    const generator = new WorkerPoolThumbnailGenerator('C:/out/thumbs', 2)

    const p1 = generator.generateForPhoto('a.jpg')
    const p2 = generator.generateForPhoto('b.jpg')
    const p3 = generator.generateForPhoto('c.jpg')

    expect(createdWorkers).toHaveLength(2)
    expect(createdWorkers[0]?.postMessage).toHaveBeenCalledTimes(1)
    expect(createdWorkers[1]?.postMessage).toHaveBeenCalledTimes(1)

    createdWorkers[0]?.emit('message', { id: 0, fileName: 'a.webp' })
    await expect(p1).resolves.toBe('a.webp')

    expect(createdWorkers[0]?.postMessage).toHaveBeenCalledTimes(2)
    expect(createdWorkers[0]?.postMessage).toHaveBeenLastCalledWith({
      id: 2,
      sourcePath: 'c.jpg'
    })

    createdWorkers[1]?.emit('message', { id: 1, fileName: 'b.webp' })
    createdWorkers[0]?.emit('message', { id: 2, fileName: 'c.webp' })
    await expect(p2).resolves.toBe('b.webp')
    await expect(p3).resolves.toBe('c.webp')
  })

  it('rejects with the worker error message', async () => {
    createdWorkers.length = 0
    const generator = new WorkerPoolThumbnailGenerator('C:/out/thumbs', 1)
    const promise = generator.generateForPhoto('bad.heic')
    createdWorkers[0]?.emit('message', { id: 0, errorMessage: 'decode failed' })
    await expect(promise).rejects.toThrow('decode failed')
  })

  it('rejects further calls after dispose', async () => {
    createdWorkers.length = 0
    const generator = new WorkerPoolThumbnailGenerator('C:/out/thumbs', 1)
    await generator.dispose()
    await expect(generator.generateForPhoto('a.jpg')).rejects.toThrow('disposed')
  })
})
