import { describe, expect, it } from 'vitest'

import {
  buildGroupDisplayTitledPhotoFileName,
  buildGroupDisplayTitledPhotoOutputRelativePath,
  createOrganizedPhotoFileName
} from '@domain/services/PhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'

describe('PhotoNamingService', () => {
  it('creates an organized file name from timestamp and original name (legacy stem)', () => {
    const fileName = createOrganizedPhotoFileName('IMG_1001.JPG', {
      iso: '2025-04-03T10:11:12.000Z',
      year: '2025',
      month: '04',
      day: '03',
      time: '101112'
    })

    expect(fileName).toBe('2025-04-03_101112_IMG_1001.JPG')
  })

  it('builds group-display-titled file name with original extension', () => {
    const fileName = buildGroupDisplayTitledPhotoFileName(
      '2026-04 seoul',
      {
        iso: '2025-04-03T10:11:12.000Z',
        year: '2025',
        month: '04',
        day: '03',
        time: '101112'
      },
      'IMG_1001.JPG',
      ''
    )

    expect(fileName).toBe('2025-04-03_101112_2026-04_seoul.JPG')
  })

  it('applies collision suffix before extension', () => {
    const fileName = buildGroupDisplayTitledPhotoFileName(
      '2026-04 base',
      {
        iso: '2025-04-03T10:11:12.000Z',
        year: '2025',
        month: '04',
        day: '03',
        time: '101112'
      },
      'x.png',
      '_001'
    )

    expect(fileName).toBe('2025-04-03_101112_2026-04_base_001.png')
  })

  it('builds group-display-titled output path with year, month, region', () => {
    const relativePath = buildGroupDisplayTitledPhotoOutputRelativePath(
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
      '2026-04 seoul',
      defaultOrganizationRules,
      ''
    )

    expect(relativePath).toBe(
      '2025/04/seoul/2025-04-03_101112_2026-04_seoul.JPG'
    )
  })

  it('routes captures to the capture folder when gps is missing', () => {
    const relativePath = buildGroupDisplayTitledPhotoOutputRelativePath(
      {
        sourceFileName: 'shot.png',
        missingGpsCategory: 'capture',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      '2026-04 capture',
      defaultOrganizationRules,
      ''
    )

    expect(relativePath).toBe(
      '2025/04/capture/2025-04-03_101112_2026-04_capture.png'
    )
  })
})
