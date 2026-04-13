import { describe, expect, it } from 'vitest'

import {
  formatDuplicateListForClipboard,
  formatIssueListForClipboard
} from './organizeClipboardFormatters'

describe('formatDuplicateListForClipboard', () => {
  it('formats canonical and duplicate lines', () => {
    const text = formatDuplicateListForClipboard([
      {
        canonicalSourcePath: '/a/keep.jpg',
        duplicateSourcePaths: ['/b/d1.jpg', '/b/d2.jpg']
      }
    ])
    expect(text).toContain('canonical: /a/keep.jpg')
    expect(text).toContain('duplicate: /b/d1.jpg')
    expect(text).toContain('duplicate: /b/d2.jpg')
  })
})

describe('formatIssueListForClipboard', () => {
  it('omits optional lines when undefined', () => {
    const text = formatIssueListForClipboard([
      {
        code: 'E1',
        severity: 'warning',
        stage: 'copy',
        sourcePath: '/src/x.jpg',
        message: 'failed'
      }
    ])
    expect(text).toContain('severity: warning')
    expect(text).toContain('message: failed')
    expect(text).not.toContain('photoId:')
  })

  it('includes optional fields when present', () => {
    const text = formatIssueListForClipboard([
      {
        code: 'E2',
        severity: 'error',
        stage: 'hash',
        sourcePath: '/src/y.jpg',
        photoId: 'pid',
        outputRelativePath: 'out/a.jpg',
        destinationPath: 'dest/b.jpg',
        message: 'bad'
      }
    ])
    expect(text).toContain('photoId: pid')
    expect(text).toContain('outputRelativePath: out/a.jpg')
    expect(text).toContain('destinationPath: dest/b.jpg')
  })
})
