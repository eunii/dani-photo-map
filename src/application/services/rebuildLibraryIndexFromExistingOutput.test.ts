import { describe, expect, it } from 'vitest'

import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'

describe('rebuildLibraryIndexFromExistingOutput', () => {
  it('keeps gps photos separated by folder label when output folders differ', () => {
    const rebuilt = rebuildLibraryIndexFromExistingOutput({
      outputRoot: 'C:/photos/output',
      photos: [
        {
          id: 'photo-yosemite',
          sourcePath:
            'C:/photos/output/2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG',
          sourceFileName: '2026-04-03_080000_IMG_0001.JPG',
          capturedAt: {
            iso: '2026-04-03T08:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '080000'
          },
          regionName: 'california',
          folderGroupingLabel: '요세미티_국립공원그룹',
          outputRelativePath:
            '2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG'
        },
        {
          id: 'photo-la',
          sourcePath: 'C:/photos/output/2026/04/la/2026-04-03_090000_IMG_0002.JPG',
          sourceFileName: '2026-04-03_090000_IMG_0002.JPG',
          capturedAt: {
            iso: '2026-04-03T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '090000'
          },
          regionName: 'california',
          folderGroupingLabel: 'la',
          outputRelativePath: '2026/04/la/2026-04-03_090000_IMG_0002.JPG'
        }
      ]
    })

    expect(rebuilt?.groups).toHaveLength(2)
    expect(rebuilt?.groups.map((group) => group.displayTitle).sort()).toEqual(
      ['la', '요세미티_국립공원그룹'].sort()
    )
  })
})
