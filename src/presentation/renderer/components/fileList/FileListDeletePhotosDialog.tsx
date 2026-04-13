import type { MouseEvent } from 'react'

export interface FileListDeletePhotosDialogProps {
  selectedCount: number
  isDeletingPhotos: boolean
  onOverlayClick: () => void
  onContentClick: (event: MouseEvent) => void
  onCancel: () => void
  onConfirm: () => void
}

export function FileListDeletePhotosDialog({
  selectedCount,
  isDeletingPhotos,
  onOverlayClick,
  onContentClick,
  onCancel,
  onConfirm
}: FileListDeletePhotosDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--app-foreground)_22%,transparent)]/40 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="delete-photos-dialog-title"
      onClick={onOverlayClick}
    >
      <div
        className="w-full max-w-[430px] rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
        onClick={onContentClick}
      >
        <h2
          id="delete-photos-dialog-title"
          className="text-base font-semibold text-[var(--app-foreground)]"
        >
          선택한 파일 삭제
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          선택한 {selectedCount}장을 출력 폴더에서 지우고 index.json에서도 제거합니다. 이
          작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-medium text-[var(--app-foreground)] disabled:opacity-50"
            disabled={isDeletingPhotos}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-[12px] bg-[var(--app-danger)] px-3.5 py-2 text-sm font-medium text-[var(--app-danger-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeletingPhotos}
            onClick={onConfirm}
          >
            {isDeletingPhotos ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
