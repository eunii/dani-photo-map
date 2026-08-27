import { describe, expect, it } from 'vitest'

import {
  formatPreviewLoadingButtonLabel,
  formatPreviewLoadingStatusLine
} from '@presentation/renderer/pages/organize/previewLoadingLabel'

describe('previewLoadingLabel', () => {
  it('shows idle text until loading starts, then completed/total', () => {
    expect(
      formatPreviewLoadingButtonLabel(false, null, '정리 시작하기')
    ).toBe('정리 시작하기')
    expect(formatPreviewLoadingButtonLabel(true, null, '정리 시작하기')).toBe(
      '불러오는 중…'
    )
    expect(
      formatPreviewLoadingButtonLabel(
        true,
        { stage: 'prepare', completed: 12, total: 380 },
        '정리 시작하기'
      )
    ).toBe('불러오는 중 12/380')
  })

  it('describes prepare versus preview-image stages', () => {
    expect(formatPreviewLoadingStatusLine(null)).toBe(
      '파일을 준비하고 있습니다…'
    )
    expect(
      formatPreviewLoadingStatusLine({
        stage: 'prepare',
        completed: 12,
        total: 380
      })
    ).toBe('파일 준비 12 / 380')
    expect(
      formatPreviewLoadingStatusLine({
        stage: 'preview-images',
        completed: 3,
        total: 15
      })
    ).toBe('미리보기 이미지 3 / 15')
  })
})
