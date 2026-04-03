import { describe, expect, it, vi } from 'vitest'

import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'

describe('LoadLibraryIndexUseCase', () => {
  it('normalizes the output root before delegating to the store', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn()
    }
    const useCase = new LoadLibraryIndexUseCase(libraryIndexStore)

    await useCase.execute({
      outputRoot: 'C:\\photos\\output'
    })

    expect(libraryIndexStore.load).toHaveBeenCalledWith('C:/photos/output')
  })
})
