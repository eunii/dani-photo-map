import { useEffect, useMemo, useState } from 'react'

import type { GroupDetail } from '@shared/types/preload'

interface GroupDetailPanelProps {
  group?: GroupDetail
  outputRoot?: string
  isSaving?: boolean
  onSave?: (nextGroup: {
    title: string
    companions: string[]
    notes?: string
    representativePhotoId?: string
  }) => Promise<void>
}

function toFileUrl(outputRoot: string, relativePath?: string): string | undefined {
  if (!relativePath) {
    return undefined
  }

  return encodeURI(
    `file:///${`${outputRoot}/${relativePath}`.replace(/\\/g, '/').replace(/^\/+/, '')}`
  )
}

export function GroupDetailPanel({
  group,
  outputRoot,
  isSaving = false,
  onSave
}: GroupDetailPanelProps) {
  const [title, setTitle] = useState('')
  const [companionsText, setCompanionsText] = useState('')
  const [notes, setNotes] = useState('')
  const [representativePhotoId, setRepresentativePhotoId] = useState('')

  useEffect(() => {
    setTitle(group?.title ?? '')
    setCompanionsText(group?.companions.join(', ') ?? '')
    setNotes(group?.notes ?? '')
    setRepresentativePhotoId(group?.representativePhotoId ?? '')
  }, [group])

  const representativeThumbnailUrl = useMemo(
    () => (outputRoot ? toFileUrl(outputRoot, group?.representativeThumbnailRelativePath) : undefined),
    [group?.representativeThumbnailRelativePath, outputRoot]
  )

  async function handleSave(): Promise<void> {
    if (!group || !onSave) {
      return
    }

    await onSave({
      title,
      companions: companionsText
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      notes: notes.trim() || undefined,
      representativePhotoId: representativePhotoId || undefined
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">그룹 상세</h2>
        <p className="text-xs text-slate-500">
          제목, 동행인, 메모, 대표 사진을 수정할 수 있습니다.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {!group ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                그룹을 선택하세요.
              </p>
              <p className="text-sm text-slate-600">
                왼쪽 목록에서 그룹을 선택하면 상세 정보와 편집 폼이 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {representativeThumbnailUrl ? (
                  <img
                    src={representativeThumbnailUrl}
                    alt={group.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                    썸네일 없음
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">기본 제목</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {group.displayTitle}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">사진 수</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {group.photoCount}장
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2">
                  <p className="text-xs text-slate-500">그룹 키</p>
                  <p className="mt-1 break-all text-xs text-slate-700">
                    {group.groupKey}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-800">제목</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-blue-400"
                  placeholder={group.displayTitle}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-800">동행인</span>
                <input
                  value={companionsText}
                  onChange={(event) => setCompanionsText(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-blue-400"
                  placeholder="예: Alice, Bob"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-800">대표 사진</span>
                <select
                  value={representativePhotoId}
                  onChange={(event) => setRepresentativePhotoId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-blue-400"
                >
                  {group.photos.map((photo) => (
                    <option key={photo.id} value={photo.id}>
                      {photo.sourceFileName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-800">메모</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-blue-400"
                  placeholder="이 그룹에 대한 메모를 남겨두세요."
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">대표 사진 후보</p>
                <div className="mt-3 grid gap-2">
                  {group.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        photo.id === representativePhotoId
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {photo.sourceFileName}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                >
                  {isSaving ? '저장 중...' : '그룹 저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
