import { useEffect, useMemo, useState } from 'react'

import { Button, Input, TextArea } from '@heroui/react'

import { buildGroupAwarePhotoOutputRelativePath } from '@domain/services/GroupAwarePhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type {
  GroupDetail,
  LibraryIndexLoadSource
} from '@shared/types/preload'

interface MoveTargetGroup {
  id: string
  title: string
  photoCount: number
  representativeGps?: {
    latitude: number
    longitude: number
  }
}

interface PreviewRenameRow {
  photoId: string
  sourceFileName: string
  currentOutputRelativePath?: string
  nextOutputRelativePath: string
  willChange: boolean
}

function toPreviewTimestamp(capturedAtIso?: string) {
  if (!capturedAtIso) {
    return undefined
  }

  const date = new Date(capturedAtIso)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return {
    iso: capturedAtIso,
    year: String(date.getUTCFullYear()).padStart(4, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
    time: [
      String(date.getUTCHours()).padStart(2, '0'),
      String(date.getUTCMinutes()).padStart(2, '0'),
      String(date.getUTCSeconds()).padStart(2, '0')
    ].join('')
  }
}

interface GroupDetailPanelProps {
  group?: GroupDetail
  allGroups?: MoveTargetGroup[]
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
  const effectivePreviewTitle = useMemo(() => {
    const trimmed = title.trim()

    if (trimmed) {
      return trimmed
    }

    return group?.displayTitle ?? ''
  }, [group?.displayTitle, title])
  const renamePreviewRows = useMemo<PreviewRenameRow[]>(() => {
    if (!group) {
      return []
    }

    return [...group.photos]
      .sort((left, right) => {
        const leftIso = left.capturedAtIso ?? ''
        const rightIso = right.capturedAtIso ?? ''

        if (leftIso !== rightIso) {
          return leftIso.localeCompare(rightIso)
        }

        return left.sourceFileName.localeCompare(right.sourceFileName)
      })
      .map((photo, index) => {
        const nextOutputRelativePath = buildGroupAwarePhotoOutputRelativePath(
          {
            sourceFileName: photo.sourceFileName,
            capturedAt: toPreviewTimestamp(photo.capturedAtIso),
            gps: photo.gps,
            regionName: photo.regionName,
            missingGpsCategory: photo.missingGpsCategory
          },
          effectivePreviewTitle,
          index + 1,
          defaultOrganizationRules
        )

        return {
          photoId: photo.id,
          sourceFileName: photo.sourceFileName,
          currentOutputRelativePath: photo.outputRelativePath,
          nextOutputRelativePath,
          willChange: photo.outputRelativePath !== nextOutputRelativePath
        }
      })
  }, [effectivePreviewTitle, group])
  const renamePreviewSummary = useMemo(() => {
    const changedCount = renamePreviewRows.filter((row) => row.willChange).length

    return {
      changedCount,
      unchangedCount: Math.max(0, renamePreviewRows.length - changedCount)
    }
  }, [renamePreviewRows])

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
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--app-foreground)]">그룹 상세</h2>
        <p className="text-xs text-[var(--app-muted)]">
          제목, 동행인, 메모, 대표 사진을 수정할 수 있습니다.
        </p>
      </div>

      <div className="rounded-[16px] bg-[var(--app-surface-strong)] p-3">
        {!group ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-[14px] bg-[var(--app-surface)] p-5 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--app-foreground)]">
                그룹을 선택하세요.
              </p>
              <p className="text-sm text-[var(--app-muted)]">
                왼쪽 목록에서 그룹을 선택하면 상세 정보와 편집 폼이 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[148px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[14px] bg-[var(--app-surface)]">
                {representativeThumbnailUrl && !thumbnailLoadFailed ? (
                  <img
                    src={representativeThumbnailUrl}
                    alt={group.title}
                    className="h-40 w-full object-cover"
                    onError={() => setThumbnailLoadFailed(true)}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-[var(--app-muted)]">
                    썸네일 없음
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[14px] bg-[var(--app-surface)] p-3">
                  <p className="text-xs text-slate-500">기본 제목</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {group.displayTitle}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[var(--app-surface)] p-3">
                  <p className="text-xs text-slate-500">사진 수</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {group.photoCount}장
                  </p>
                </div>
                <div className="rounded-[14px] bg-[var(--app-surface)] p-3 sm:col-span-2">
                  <p className="text-xs text-slate-500">그룹 키</p>
                  <p className="mt-1 break-all text-xs text-slate-700">
                    {group.groupKey}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[14px] bg-[var(--app-surface)] p-3">
                <p className="text-sm font-medium text-slate-900">기본 그룹명 제안</p>
                {titleSuggestions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {titleSuggestions.map((suggestedTitle) => (
                      <Button
                        key={suggestedTitle}
                        variant="ghost"
                        className="h-8 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 text-xs font-medium text-[var(--app-accent-strong)]"
                        onPress={() => setTitle(suggestedTitle)}
                      >
                        {suggestedTitle}
                      </Button>
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
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="text-sm"
                  classNames={{
                    inputWrapper:
                      'rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-none',
                    input: 'text-[var(--app-foreground)]',
                    innerWrapper: 'bg-transparent'
                  }}
                  placeholder={group.displayTitle}
                />
              </label>

              <div className="rounded-[14px] bg-[var(--app-surface)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      저장 전 예상 파일명 미리보기
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      현재 입력한 그룹명 기준 예상 결과입니다. 실제 저장 시 같은 폴더에
                      이미 파일이 있으면 시퀀스 번호가 달라질 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      변경 {renamePreviewSummary.changedCount}장
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      유지 {renamePreviewSummary.unchangedCount}장
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {renamePreviewRows.length === 0 ? (
                    <p className="text-sm text-slate-500">미리볼 사진이 없습니다.</p>
                  ) : (
                    <>
                      {renamePreviewRows.slice(0, 8).map((row) => (
                        <div
                          key={row.photoId}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
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
                      {renamePreviewRows.length > 8 ? (
                        <p className="text-xs text-slate-500">
                          총 {renamePreviewRows.length}장 중 처음 8장만 표시합니다.
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-800">동행인</span>
                <Input
                  value={companionsText}
                  onChange={(event) => setCompanionsText(event.target.value)}
                  className="text-sm"
                  classNames={{
                    inputWrapper:
                      'rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-none',
                    input: 'text-[var(--app-foreground)]',
                    innerWrapper: 'bg-transparent'
                  }}
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
                <TextArea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="text-sm"
                  classNames={{
                    inputWrapper:
                      'rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-none',
                    input: 'min-h-28 text-[var(--app-foreground)]',
                    innerWrapper: 'bg-transparent'
                  }}
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
                    <Button
                      variant="primary"
                      className="rounded-[12px] bg-[var(--app-button)] px-4 text-sm font-medium text-[var(--app-button-foreground)] disabled:opacity-60"
                      disabled={
                        isMovingPhotos ||
                        !moveTargetGroupId ||
                        selectedPhotoIds.length === 0
                      }
                      onPress={() => void handleMovePhotos()}
                    >
                      {isMovingPhotos ? '이동 중...' : '선택 사진 이동'}
                    </Button>
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
                <Button
                  variant="primary"
                  className="rounded-[12px] bg-[var(--app-button)] px-4 text-sm font-medium text-[var(--app-button-foreground)] disabled:opacity-60"
                  disabled={isSaving}
                  onPress={() => void handleSave()}
                >
                  {isSaving ? '저장 중...' : '그룹 저장'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
