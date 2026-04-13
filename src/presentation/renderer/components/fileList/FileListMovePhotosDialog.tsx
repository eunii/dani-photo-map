import type { MouseEvent } from 'react'

import {
  DEST_CUSTOM,
  DEST_YEAR_MONTH_ONLY
} from '@presentation/renderer/pages/fileList/fileListPageConstants'

export interface FileListMoveDestinationOption {
  groupId: string
  segment: string
  label: string
  photoCount: number
}

export interface FileListMovePhotosDialogProps {
  selectedCount: number
  moveDestinationUsesChildFolders: boolean
  breadcrumbPathLabel: string
  destinationListContextLabel: string
  moveDestinationFolderOptions: FileListMoveDestinationOption[]
  destinationSelect: string
  manualDestinationFolder: string
  isMovingPhotos: boolean
  onOverlayClick: () => void
  onContentClick: (event: MouseEvent) => void
  onDestinationSelectChange: (value: string) => void
  onManualDestinationChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function FileListMovePhotosDialog({
  selectedCount,
  moveDestinationUsesChildFolders,
  breadcrumbPathLabel,
  destinationListContextLabel,
  moveDestinationFolderOptions,
  destinationSelect,
  manualDestinationFolder,
  isMovingPhotos,
  onOverlayClick,
  onContentClick,
  onDestinationSelectChange,
  onManualDestinationChange,
  onCancel,
  onConfirm
}: FileListMovePhotosDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--app-foreground)_22%,transparent)]/40 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="move-to-folder-dialog-title"
      onClick={onOverlayClick}
    >
      <div
        className="max-h-[min(88vh,720px)] w-full max-w-[560px] overflow-y-auto rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
        onClick={onContentClick}
      >
        <h2
          id="move-to-folder-dialog-title"
          className="text-base font-semibold text-[var(--app-foreground)]"
        >
          폴더로 이동
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
          선택한 {selectedCount}장의 목적지입니다.{' '}
          {moveDestinationUsesChildFolders ? (
            <>
              <span className="font-medium">하위 폴더</span>는 지금 연 년·월(또는
              상위) 경로 바로 아래에 있는 폴더입니다.
            </>
          ) : (
            <>
              <span className="font-medium">동위 폴더</span>는 지금 폴더와 같은
              상위 아래에 나란히 있는 폴더입니다.
            </>
          )}
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
          드롭다운에서 고르면 아래 입력란에 같은 이름이 채워집니다. 직접 고칠 수도
          있으며, 동일한 이름의 폴더가 있으면 합쳐집니다.
        </p>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          지금 보는 경로:{' '}
          <span className="font-medium text-slate-700">{breadcrumbPathLabel}</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
          {moveDestinationUsesChildFolders
            ? '하위 목록 기준 (현재 경로): '
            : '동위 목록 기준 부모 경로: '}
          <span className="font-medium text-slate-700">
            {destinationListContextLabel}
          </span>
        </p>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-[var(--app-foreground)]">
            목적지 — {moveDestinationUsesChildFolders ? '하위 폴더' : '동위 폴더'}
            <select
              className="mt-1 w-full rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] outline-none"
              disabled={isMovingPhotos}
              value={destinationSelect === DEST_CUSTOM ? '' : destinationSelect}
              onChange={(event) => onDestinationSelectChange(event.target.value)}
            >
              <option value="">목적지 선택…</option>
              <option value={DEST_YEAR_MONTH_ONLY}>년·월만 (가운데 폴더 없음)</option>
              {moveDestinationFolderOptions.map((item) => (
                <option key={item.groupId} value={item.groupId}>
                  {item.label} ({item.photoCount}장)
                </option>
              ))}
            </select>
          </label>
          {moveDestinationFolderOptions.length === 0 ? (
            <p className="text-xs leading-5 text-[var(--app-muted)]">
              {moveDestinationUsesChildFolders
                ? '이 경로 아래에 다른 폴더가 없을 수 있습니다. 「년·월만」을 고르거나 아래에 새 이름을 입력하세요.'
                : '같은 상위에 등록된 다른 폴더가 없을 수 있습니다. 「년·월만」을 고르거나 아래에 새 이름을 입력하세요.'}
            </p>
          ) : null}
        </div>

        <label className="mt-4 block text-sm text-[var(--app-foreground)]">
          <span className="mb-1 block font-medium">
            폴더 이름 (드롭다운 선택 시 자동 입력 · 수정 가능)
          </span>
          <input
            type="text"
            value={manualDestinationFolder}
            onChange={(event) => onManualDestinationChange(event.target.value)}
            disabled={isMovingPhotos}
            placeholder="예: 주말산책"
            className="mt-1 w-full rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] outline-none"
          />
          {destinationSelect === DEST_CUSTOM && manualDestinationFolder.trim().length > 0 ? (
            <span className="mt-1 block text-xs text-[var(--app-accent-strong)]">
              목록에 없는 이름이면 새 폴더로 만듭니다.
            </span>
          ) : null}
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-medium text-[var(--app-foreground)] disabled:opacity-50"
            disabled={isMovingPhotos}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-[12px] bg-[var(--app-button)] px-3.5 py-2 text-sm font-medium text-[var(--app-button-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isMovingPhotos ||
              (manualDestinationFolder.trim().length === 0 && !destinationSelect)
            }
            onClick={onConfirm}
          >
            {isMovingPhotos ? '이동 중…' : '이동'}
          </button>
        </div>
      </div>
    </div>
  )
}
