import type { MouseEvent } from 'react'

export interface FileListRenameGroupFolderOption {
  id: string
  title: string
}

export interface FileListRenamePreviewRow {
  photoId: string
  sourceFileName: string
  currentOutputRelativePath: string | undefined
  nextOutputRelativePath: string
  willChange: boolean
}

export interface FileListRenameGroupDialogProps {
  isRenaming: boolean
  renameTargetGroupId: string
  renameNewTitle: string
  groupsInCurrentFolder: FileListRenameGroupFolderOption[]
  renamePreviewSummary: { changedCount: number; unchangedCount: number }
  renamePreviewRows: FileListRenamePreviewRow[]
  onOverlayClick: () => void
  onContentClick: (event: MouseEvent) => void
  onRenameTargetGroupIdChange: (groupId: string) => void
  onRenameNewTitleChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function FileListRenameGroupDialog({
  isRenaming,
  renameTargetGroupId,
  renameNewTitle,
  groupsInCurrentFolder,
  renamePreviewSummary,
  renamePreviewRows,
  onOverlayClick,
  onContentClick,
  onRenameTargetGroupIdChange,
  onRenameNewTitleChange,
  onCancel,
  onConfirm
}: FileListRenameGroupDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--app-foreground)_22%,transparent)]/40 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="rename-folder-dialog-title"
      onClick={onOverlayClick}
    >
      <div
        className="w-full max-w-[460px] rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
        onClick={onContentClick}
      >
        <h2
          id="rename-folder-dialog-title"
          className="text-base font-semibold text-[var(--app-foreground)]"
        >
          이름 변경
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
          이 경로 목록에 나온 폴더(그룹)의 표시 이름을 바꿉니다. 파일이 디스크에서 해당
          이름 폴더로 다시 정리될 수 있습니다.
        </p>
        <label className="mt-4 block text-sm text-[var(--app-foreground)]">
          <span className="mb-1 block font-medium">대상 폴더</span>
          <select
            className="mt-1 w-full rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] outline-none"
            disabled={isRenaming}
            value={renameTargetGroupId}
            onChange={(event) => onRenameTargetGroupIdChange(event.target.value)}
          >
            {groupsInCurrentFolder.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm text-[var(--app-foreground)]">
          <span className="mb-1 block font-medium">새 이름</span>
          <input
            type="text"
            value={renameNewTitle}
            onChange={(event) => onRenameNewTitleChange(event.target.value)}
            disabled={isRenaming}
            className="mt-1 w-full rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-foreground)] outline-none"
          />
        </label>
        <div className="mt-4 rounded-[14px] bg-[var(--app-surface-strong)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-900">
                저장 전 예상 파일명 미리보기
              </p>
              <p className="mt-1 text-xs text-slate-500">
                실제 저장 시 기존 파일 충돌이 있으면 시퀀스 번호는 달라질 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="rounded-full bg-white px-2 py-1">
                변경 {renamePreviewSummary.changedCount}장
              </span>
              <span className="rounded-full bg-white px-2 py-1">
                유지 {renamePreviewSummary.unchangedCount}장
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {renamePreviewRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                현재 선택된 폴더의 사진 미리보기를 불러오지 못했습니다.
              </p>
            ) : (
              <>
                {renamePreviewRows.slice(0, 6).map((row) => (
                  <div
                    key={row.photoId}
                    className="rounded-[12px] bg-[var(--app-surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {row.sourceFileName}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          row.willChange
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {row.willChange ? '변경 예정' : '변경 없음'}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-[11px] text-slate-600">
                      <div>
                        <p className="font-medium text-slate-500">현재</p>
                        <p className="break-all">
                          {row.currentOutputRelativePath ?? '출력 경로 없음'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-500">예상</p>
                        <p className="break-all text-slate-800">
                          {row.nextOutputRelativePath}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {renamePreviewRows.length > 6 ? (
                  <p className="text-xs text-slate-500">
                    총 {renamePreviewRows.length}장 중 처음 6장만 표시합니다.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-medium text-[var(--app-foreground)] disabled:opacity-50"
            disabled={isRenaming}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-[12px] bg-[var(--app-button)] px-3.5 py-2 text-sm font-medium text-[var(--app-button-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRenaming || !renameTargetGroupId}
            onClick={onConfirm}
          >
            {isRenaming ? '저장 중…' : '이름 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
