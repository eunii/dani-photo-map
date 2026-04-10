import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupDetail } from '@shared/types/preload'

interface MapPhotoPreviewOverlayProps {
  outputRoot?: string
  group?: GroupDetail
  photoId?: string
  onChangePhoto: (photoId: string) => void
  onClose: () => void
}

export function MapPhotoPreviewOverlay({
  outputRoot,
  group,
  photoId,
  onChangePhoto,
  onClose
}: MapPhotoPreviewOverlayProps) {
  const photoIndex = group?.photos.findIndex((candidate) => candidate.id === photoId) ?? -1
  const photo = photoIndex >= 0 ? group?.photos[photoIndex] : undefined
  const previousPhoto = photoIndex > 0 ? group?.photos[photoIndex - 1] : undefined
  const nextPhoto =
    photoIndex >= 0 && group && photoIndex < group.photos.length - 1
      ? group.photos[photoIndex + 1]
      : undefined

  if (!group || !photo) {
    return null
  }

  const imageUrl =
    outputRoot &&
    toOutputFileUrl(
      outputRoot,
      photo.thumbnailRelativePath ?? photo.outputRelativePath
    )

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-slate-950/35">
      <div className="pointer-events-auto absolute inset-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 shadow-2xl">
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-3 py-2">
          <div className="min-w-0 pr-2">
            <p className="truncate text-xs font-medium text-white/90">
              {photo.sourceFileName}
            </p>
            <p className="truncate text-[11px] text-white/70">
              {photoIndex + 1} / {group.photos.length}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-white/30 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="relative flex min-h-0 h-full w-full items-center justify-center p-1">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={photo.sourceFileName}
              className="block max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-300">
              미리보기 이미지를 불러올 수 없습니다.
            </div>
          )}

          <button
            type="button"
            disabled={!previousPhoto}
            className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-base font-semibold text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-white/35"
            onClick={() => previousPhoto && onChangePhoto(previousPhoto.id)}
          >
            ‹
          </button>

          <button
            type="button"
            disabled={!nextPhoto}
            className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-base font-semibold text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-white/35"
            onClick={() => nextPhoto && onChangePhoto(nextPhoto.id)}
          >
            ›
          </button>

          <div className="absolute bottom-2 left-1/2 z-20 w-[min(92%,760px)] -translate-x-1/2 rounded-lg bg-black/45 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur">
            <div className="truncate">{photo.sourceFileName}</div>
            <div className="truncate text-white/75">
              촬영 {photo.capturedAtIso ?? '정보 없음'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
