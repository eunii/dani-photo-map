import { describe, expect, it, vi } from 'vitest'

import { ExifrPhotoMetadataReader } from '@infrastructure/exif/ExifrPhotoMetadataReader'

function localCapturedAtParts(isoInstant: string) {
  const value = new Date(isoInstant)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const pad4 = (n: number) => String(n).padStart(4, '0')

  return {
    iso: value.toISOString(),
    year: pad4(value.getFullYear()),
    month: pad2(value.getMonth() + 1),
    day: pad2(value.getDate()),
    time: `${pad2(value.getHours())}${pad2(value.getMinutes())}${pad2(value.getSeconds())}`
  }
}

describe('ExifrPhotoMetadataReader', () => {
  it('prefers DateTimeOriginal over CreateDate for capturedAt', async () => {
    const dateOriginal = new Date('2024-05-01T01:02:03.000Z')
    const parseMetadata = vi.fn().mockResolvedValue({
      DateTimeOriginal: dateOriginal,
      CreateDate: new Date('2024-05-02T04:05:06.000Z'),
      latitude: 37.5665,
      longitude: 126.978
    })
    const reader = new ExifrPhotoMetadataReader(
      parseMetadata,
      vi.fn()
    )

    await expect(reader.read('C:/photos/IMG_0001.JPG')).resolves.toMatchObject({
      capturedAt: {
        ...localCapturedAtParts('2024-05-01T01:02:03.000Z')
      },
      capturedAtSource: 'exif-date-time-original',
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      },
      metadataIssues: []
    })
    expect(parseMetadata).toHaveBeenCalledOnce()
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
        ...localCapturedAtParts('2024-06-03T07:08:09.000Z')
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
      capturedAtSource: 'exif-date-time-digitized',
      gps: undefined,
      metadataIssues: ['gps-invalid']
    })
  })

  it('uses XMP/Photoshop date when EXIF originals are absent', async () => {
    const parseMetadata = vi
      .fn()
      .mockResolvedValueOnce({
        latitude: 37.5665,
        longitude: 126.978
      })
      .mockResolvedValueOnce({
        photoshop: {
          DateCreated: new Date('2023-08-15T12:30:00.000Z')
        }
      })
    const reader = new ExifrPhotoMetadataReader(
      parseMetadata,
      vi.fn()
    )

    await expect(reader.read('C:/photos/IMG_0005.JPG')).resolves.toMatchObject({
      capturedAt: {
        ...localCapturedAtParts('2023-08-15T12:30:00.000Z')
      },
      capturedAtSource: 'xmp-capture-date',
      metadataIssues: []
    })
    expect(parseMetadata).toHaveBeenCalledTimes(2)
  })
})
