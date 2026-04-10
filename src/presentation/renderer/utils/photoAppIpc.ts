import type {
  DeleteOutputFolderSubtreeRequest,
  DeletePhotosFromLibraryRequest,
  LibraryIndexView
} from '@shared/types/preload'

const RESTART_HINT =
  '프리로드가 오래된 버전입니다. Electron 창을 모두 닫고, 터미널에서 개발 서버를 끈 뒤 `pnpm dev`를 다시 실행하거나 `pnpm build` 후 앱을 실행하세요.'

export async function deletePhotosFromLibraryIpc(
  request: DeletePhotosFromLibraryRequest
): Promise<LibraryIndexView> {
  const app = window.photoApp
  if (typeof app.deletePhotosFromLibrary === 'function') {
    return app.deletePhotosFromLibrary(request)
  }
  if (typeof app.invokePhotoApp === 'function') {
    return app.invokePhotoApp(
      'photo-app/delete-photos-from-library',
      request
    )
  }
  throw new Error(RESTART_HINT)
}

export async function deleteOutputFolderSubtreeIpc(
  request: DeleteOutputFolderSubtreeRequest
): Promise<LibraryIndexView> {
  const app = window.photoApp
  if (typeof app.deleteOutputFolderSubtree === 'function') {
    return app.deleteOutputFolderSubtree(request)
  }
  if (typeof app.invokePhotoApp === 'function') {
    return app.invokePhotoApp(
      'photo-app/delete-output-folder-subtree',
      request
    )
  }
  throw new Error(RESTART_HINT)
}
