import { describe, expect, it } from 'vitest'

import {
  buildScanPhotoOutputRelativePath,
  createOrganizedPhotoFileName,
  resolveGroupLabelForOutputFileName,
  stripLeadingDateFromAutoGroupDisplayTitle
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

  it('strips leading YYYY-MM or YYYY-MM-DD from auto display title', () => {
    expect(stripLeadingDateFromAutoGroupDisplayTitle('2026-04 seoul')).toBe('seoul')
    expect(stripLeadingDateFromAutoGroupDisplayTitle('2026-04-03 seoul')).toBe('seoul')
  })

  it('resolveGroupLabelForOutputFileName prefers override title', () => {
    expect(
      resolveGroupLabelForOutputFileName({
        displayTitle: '2026-04 seoul',
        overrideTitle: '서울 산책',
        regionName: 'seoul'
      })
    ).toBe('서울_산책')
  })

  it('resolveGroupLabelForOutputFileName strips date when no override', () => {
    expect(
      resolveGroupLabelForOutputFileName({
        displayTitle: '2026-04 seoul',
        regionName: 'seoul'
      })
    ).toBe('seoul')
  })

  it('resolveGroupLabelForOutputFileName maps empty override to unknown region label', () => {
    expect(
      resolveGroupLabelForOutputFileName(
        {
          displayTitle: 'seoul',
          overrideTitle: '',
          regionName: 'seoul'
        },
        defaultOrganizationRules
      )
    ).toBe(defaultOrganizationRules.unknownRegionLabel)
  })

  it('applies collision suffix before extension', () => {
    const fileName = createOrganizedPhotoFileName(
      'x.png',
      {
        iso: '2025-04-03T10:11:12.000Z',
        year: '2025',
        month: '04',
        day: '03',
        time: '101112'
      },
      '_001'
    )

    expect(fileName).toBe('2025-04-03_101112_x_001.png')
  })

  it('builds scan output path with year, month, group label folder', () => {
    const relativePath = buildScanPhotoOutputRelativePath(
      {
        sourceFileName: 'IMG_1001.JPG',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      'seoul',
      defaultOrganizationRules,
      ''
    )

    expect(relativePath).toBe(
      '2025/04/seoul/2025-04-03_101112_IMG_1001.JPG'
    )
  })

  it('scan path puts files under year/month when group label is base', () => {
    const relativePath = buildScanPhotoOutputRelativePath(
      {
        sourceFileName: 'a.JPG',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      'base',
      defaultOrganizationRules,
      ''
    )

    expect(relativePath).toBe('2025/04/2025-04-03_101112_a.JPG')
  })

  it('routes capture label to capture subfolder', () => {
    const relativePath = buildScanPhotoOutputRelativePath(
      {
        sourceFileName: 'shot.png',
        capturedAt: {
          iso: '2025-04-03T10:11:12.000Z',
          year: '2025',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      'capture',
      defaultOrganizationRules,
      ''
    )

    expect(relativePath).toBe(
      '2025/04/capture/2025-04-03_101112_shot.png'
    )
  })
})
