import { describe, expect, it, vi } from 'vitest'

import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'

describe('ExifrPhotoMetadataReader', () => {
  it('prefers DateTimeOriginal over CreateDate for capturedAt', async () => {
    const reader = new ExifrPhotoMetadataReader(
      vi.fn().mockResolvedValue({
        DateTimeOriginal: new Date('2024-05-01T01:02:03.000Z'),
        CreateDate: new Date('2024-05-02T04:05:06.000Z'),
        latitude: 37.5665,
        longitude: 126.978
      }),
      vi.fn()
    )

    await expect(reader.read('C:/photos/IMG_0001.JPG')).resolves.toMatchObject({
      capturedAt: {
        iso: '2024-05-01T01:02:03.000Z',
        year: '2024',
        month: '05',
        day: '01',
        time: '010203'
      },
      capturedAtSource: 'exif-date-time-original',
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      },
      metadataIssues: []
    })
  })

  it('falls back to file modified time when exif date fields are missing', async () => {
    const reader = new ExifrPhotoMetadataReader(
      vi.fn().mockResolvedValue({
        latitude: 37.5665,
        longitude: 126.978
      }),
      vi.fn().mockResolvedValue({
        mtime: new Date('2024-06-03T07:08:09.000Z')
      })
    )

    await expect(reader.read('C:/photos/IMG_0002.JPG')).resolves.toMatchObject({
      capturedAt: {
        iso: '2024-06-03T07:08:09.000Z',
        year: '2024',
        month: '06',
        day: '03',
        time: '070809'
      },
      capturedAtSource: 'file-modified-at',
      metadataIssues: ['captured-at-fallback-file-modified-at']
    })
  })

  it('records missing gps and missing capturedAt when neither exif nor file stat help', async () => {
    const reader = new ExifrPhotoMetadataReader(
      vi.fn().mockResolvedValue(null),
      vi.fn().mockRejectedValue(new Error('stat failed'))
    )

    await expect(reader.read('C:/photos/IMG_0003.JPG')).resolves.toMatchObject({
      capturedAt: undefined,
      gps: undefined,
      metadataIssues: ['metadata-empty', 'captured-at-missing', 'gps-missing']
    })
  })

  it('records gps-invalid when coordinates are outside valid ranges', async () => {
    const reader = new ExifrPhotoMetadataReader(
      vi.fn().mockResolvedValue({
        CreateDate: new Date('2024-05-02T04:05:06.000Z'),
        latitude: 181,
        longitude: 126.978
      }),
      vi.fn()
    )

    await expect(reader.read('C:/photos/IMG_0004.JPG')).resolves.toMatchObject({
      capturedAtSource: 'exif-create-date',
      gps: undefined,
      metadataIssues: ['gps-invalid']
    })
  })
})
