export const photoAppInvokeChannels = {
  selectDirectory: 'photo-app/select-directory',
  loadLibraryIndex: 'photo-app/load-library-index',
  loadLibraryGroupDetail: 'photo-app/load-library-group-detail',
  previewPendingOrganization: 'photo-app/preview-pending-organization',
  scanPhotoLibrary: 'photo-app/scan-photo-library',
  updatePhotoGroup: 'photo-app/update-photo-group',
  movePhotosToGroup: 'photo-app/move-photos-to-group',
  deletePhotosFromLibrary: 'photo-app/delete-photos-from-library',
  deleteOutputFolderSubtree: 'photo-app/delete-output-folder-subtree'
} as const

export const photoAppEventChannels = {
  scanPhotoLibraryProgress: 'photo-app/scan-photo-library-progress'
} as const

export type PhotoAppInvokeChannel =
  (typeof photoAppInvokeChannels)[keyof typeof photoAppInvokeChannels]
