import { useEffect, useMemo, useState } from 'react'

import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type {
  GroupDetail,
  LibraryIndexLoadSource
} from '@shared/types/preload'

interface GroupDetailPanelProps {
  group?: GroupDetail
  allGroups?: GroupDetail[]
  titleSuggestions?: string[]
  outputRoot?: string
  loadSource?: LibraryIndexLoadSource | null
  isSaving?: boolean
  isMovingPhotos?: boolean
  onSave?: (nextGroup: {
    title: string
    companions: string[]
    notes?: string
    representativePhotoId?: string
  }) => Promise<void>
  onMovePhotos?: (nextMove: {
    sourceGroupId: string
    destinationGroupId: string
    photoIds: string[]
  }) => Promise<void>
}

export function GroupDetailPanel({
  group,
  allGroups = [],
  titleSuggestions = [],
  outputRoot,
  loadSource,
  isSaving = false,
  isMovingPhotos = false,
  onSave,
  onMovePhotos
}: GroupDetailPanelProps) {
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false)
  const [title, setTitle] = useState('')
  const [companionsText, setCompanionsText] = useState('')
  const [notes, setNotes] = useState('')
  const [representativePhotoId, setRepresentativePhotoId] = useState('')
  const [moveTargetGroupId, setMoveTargetGroupId] = useState('')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])

  useEffect(() => {
    setThumbnailLoadFailed(false)
    setTitle(group?.title ?? '')
    setCompanionsText(group?.companions.join(', ') ?? '')
    setNotes(group?.notes ?? '')
    setRepresentativePhotoId(group?.representativePhotoId ?? '')
    setMoveTargetGroupId('')
    setSelectedPhotoIds([])
  }, [group])

  const representativeThumbnailUrl = useMemo(
    () =>
      outputRoot
        ? toOutputFileUrl(outputRoot, group?.representativeThumbnailRelativePath)
        : undefined,
    [group?.representativeThumbnailRelativePath, outputRoot]
  )
  const moveTargetGroups = useMemo(
    () =>
      allGroups.filter(
        (candidate) => candidate.id !== group?.id && Boolean(candidate.representativeGps)
      ),
    [allGroups, group?.id]
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

  async function handleMovePhotos(): Promise<void> {
    if (
      !group ||
      !onMovePhotos ||
      !moveTargetGroupId ||
      selectedPhotoIds.length === 0
    ) {
      return
    }

    await onMovePhotos({
      sourceGroupId: group.id,
      destinationGroupId: moveTargetGroupId,
      photoIds: selectedPhotoIds
    })
  }

  function togglePhotoSelection(photoId: string): void {
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((currentPhotoId) => currentPhotoId !== photoId)
        : [...current, photoId]
    )
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
                {representativeThumbnailUrl && !thumbnailLoadFailed ? (
                  <img
                    src={representativeThumbnailUrl}
                    alt={group.title}
                    className="h-40 w-full object-cover"
                    onError={() => setThumbnailLoadFailed(true)}
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
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">기본 그룹명 제안</p>
                {titleSuggestions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {titleSuggestions.map((suggestedTitle) => (
                      <button
                        key={suggestedTitle}
                        type="button"
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                        onClick={() => setTitle(suggestedTitle)}
                      >
                        {suggestedTitle}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    가까운 GPS 그룹에서 기본 제안 제목이 없어 직접 입력합니다.
                  </p>
                )}
              </div>

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

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      사진을 다른 그룹으로 이동
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      선택한 사진은 대상 그룹 소속으로 들어가고 앱 내부 위치는 그
                      그룹 대표 위치 기준으로 맞춰집니다. 파일 EXIF는 수정하지
                      않습니다.
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">
                      이동할 대상 그룹
                    </span>
                    <select
                      value={moveTargetGroupId}
                      onChange={(event) => setMoveTargetGroupId(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-blue-400"
                    >
                      <option value="">대상 그룹 선택</option>
                      {moveTargetGroups.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title} · 사진 {candidate.photoCount}장
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-2">
                    {group.photos.map((photo) => (
                      <label
                        key={photo.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPhotoIds.includes(photo.id)}
                          onChange={() => togglePhotoSelection(photo.id)}
                        />
                        <span className="flex-1 truncate">{photo.sourceFileName}</span>
                        {photo.missingGpsCategory ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            {photo.missingGpsCategory}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={
                        isMovingPhotos ||
                        !moveTargetGroupId ||
                        selectedPhotoIds.length === 0
                      }
                      onClick={() => void handleMovePhotos()}
                    >
                      {isMovingPhotos ? '이동 중...' : '선택 사진 이동'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <p className="mr-auto text-xs text-slate-500">
                  {loadSource === 'fallback' ||
                  loadSource === 'folder-structure'
                    ? '폴더 구조 기반 상태에서 저장하면 GPS/대표 정보는 유지한 채 index.json을 새로 만들고 그룹 메타데이터를 함께 반영합니다.'
                    : '저장하면 그룹 메타데이터와 함께 출력 파일명이 그룹 제목 기준으로 재정리됩니다.'}
                </p>
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
