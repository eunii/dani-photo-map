import { vi } from 'vitest'

import type { ExistingOutputScannerPort } from '@application/ports/ExistingOutputScannerPort'

export function createExistingOutputScannerPortMock(): ExistingOutputScannerPort {
  return {
    scan: vi.fn().mockResolvedValue({
      outputRoot: 'C:/output',
      photos: []
    }),
    scanGroupSummaries: vi.fn().mockResolvedValue([]),
    scanGroupPhotos: vi.fn().mockResolvedValue([])
  }
}
