export type PreviewPendingOrganizationProgressPayload = {
  stage: 'prepare' | 'preview-images'
  completed: number
  total: number
}

export interface PreviewPendingOrganizationExecuteOptions {
  onPreviewProgress?: (payload: PreviewPendingOrganizationProgressPayload) => void
}
