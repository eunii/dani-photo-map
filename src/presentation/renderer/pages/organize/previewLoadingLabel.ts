import type { PreviewPendingOrganizationProgressPayload } from '@shared/types/preload'

export function formatPreviewLoadingButtonLabel(
  isLoadingPreview: boolean,
  previewProgress: PreviewPendingOrganizationProgressPayload | null,
  idleLabel: string
): string {
  if (!isLoadingPreview) {
    return idleLabel
  }

  if (!previewProgress || previewProgress.total <= 0) {
    return '불러오는 중…'
  }

  return `불러오는 중 ${previewProgress.completed}/${previewProgress.total}`
}

export function formatPreviewLoadingStatusLine(
  previewProgress: PreviewPendingOrganizationProgressPayload | null
): string {
  if (!previewProgress || previewProgress.total <= 0) {
    return '파일을 준비하고 있습니다…'
  }

  if (previewProgress.stage === 'preview-images') {
    return `미리보기 이미지 ${previewProgress.completed} / ${previewProgress.total}`
  }

  return `파일 준비 ${previewProgress.completed} / ${previewProgress.total}`
}
