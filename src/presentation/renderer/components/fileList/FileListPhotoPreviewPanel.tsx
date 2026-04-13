import { formatCapturedLabel } from '@presentation/renderer/pages/fileList/fileListPageFormat'
import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'

export interface FileListPhotoPreviewPanelProps {
  selectedRow: FlatPhotoRow | undefined
  previewThumbUrl: string | undefined
}

export function FileListPhotoPreviewPanel({
  selectedRow,
  previewThumbUrl
}: FileListPhotoPreviewPanelProps) {
  return (
    <div className="min-h-0 min-w-0 lg:h-full">
      <div className="flex h-full min-h-0 flex-col rounded-xl bg-[var(--app-surface-strong)] p-2">
        <h2 className="text-xs font-semibold text-slate-900">미리보기</h2>
        {!selectedRow ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            목록에서 사진을 선택하면 썸네일 미리보기가 표시됩니다.
          </p>
        ) : (
          <div className="app-scroll mt-2 min-h-0 flex-1 space-y-2 pr-0.5">
            <div className="overflow-hidden rounded-lg bg-[var(--app-surface)]">
              {previewThumbUrl ? (
                <img
                  src={previewThumbUrl}
                  alt={selectedRow.photo.sourceFileName}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[min(38vh,360px)] w-full object-contain"
                />
              ) : (
                <div className="flex min-h-[120px] items-center justify-center text-xs text-slate-500">
                  미리보기를 불러올 수 없습니다.
                </div>
              )}
            </div>
            <dl className="space-y-1.5 text-xs">
              <div>
                <dt className="text-[10px] text-slate-500">파일명</dt>
                <dd className="break-all font-medium text-slate-900">
                  {selectedRow.photo.sourceFileName}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">촬영 시각</dt>
                <dd className="text-slate-800">
                  {formatCapturedLabel(selectedRow.photo.capturedAtIso)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">폴더(그룹)</dt>
                <dd className="text-slate-800">{selectedRow.groupDisplayTitle}</dd>
              </div>
              {selectedRow.photo.outputRelativePath ? (
                <div>
                  <dt className="text-[10px] text-slate-500">출력 상대 경로</dt>
                  <dd className="break-all font-mono text-[10px] text-slate-700">
                    {selectedRow.photo.outputRelativePath}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
