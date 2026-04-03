import { describe, expect, it } from 'vitest'

import {
  buildPhotoOutputRelativePath,
  createOrganizedPhotoFileName
} from '@domain/services/PhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'

describe('PhotoNamingService', () => {
  it('creates an organized file name from timestamp and original name', () => {
    const fileName = createOrganizedPhotoFileName('IMG_1001.JPG', {
      iso: '2025-04-03T10:11:12.000Z',
      year: '2025',
      month: '04',
      day: '03',
      time: '101112'
    })

    expect(fileName).toBe('2025-04-03_101112_IMG_1001.JPG')
  })

  it('builds the output path using year, month, and region', () => {
    const relativePath = buildPhotoOutputRelativePath(
      {
        sourceFileName: 'IMG_1001.JPG',
        regionName: 'seoul',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      defaultOrganizationRules
    )

    expect(relativePath).toBe('2025/04/seoul/2025-04-03_101112_IMG_1001.JPG')
  })

  it('routes captures to the capture folder when gps is missing', () => {
    const relativePath = buildPhotoOutputRelativePath(
      {
        sourceFileName: 'Screenshot 2025-04-03.png',
        missingGpsCategory: 'capture',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      defaultOrganizationRules
    )

    expect(relativePath).toBe(
      '2025/04/capture/2025-04-03_101112_Screenshot 2025-04-03.png'
    )
  })
})
