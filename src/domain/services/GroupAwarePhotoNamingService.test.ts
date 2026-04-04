import { describe, expect, it } from 'vitest'

import {
  buildGroupAwarePhotoOutputRelativePath,
  createGroupAwarePhotoFileName
} from '@domain/services/GroupAwarePhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'

describe('GroupAwarePhotoNamingService', () => {
  it('creates grouped file names with a three-digit sequence number', () => {
    const fileName = createGroupAwarePhotoFileName(
      'IMG_1001.JPG',
      1,
      {
        iso: '2026-04-03T10:11:12.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '101112'
      }
    )

    expect(fileName).toBe('2026-04-03_101112_IMG_1001_001.JPG')
  })

  it('builds output paths as year/month/group-label from the merged group title', () => {
    const relativePath = buildGroupAwarePhotoOutputRelativePath(
      {
        sourceFileName: 'IMG_1001.JPG',
        regionName: 'seoul',
        capturedAt: {
          iso: '2026-04-03T10:11:12.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '101112'
        }
      },
      '서울 산책',
      12,
      defaultOrganizationRules
    )

    expect(relativePath).toBe('2026/04/서울_산책/2026-04-03_101112_IMG_1001_012.JPG')
  })
})
