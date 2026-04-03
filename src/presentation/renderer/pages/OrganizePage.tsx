import { useMemo, useState } from 'react'

import type {
  PreviewPendingOrganizationResult,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

interface OrganizePageProps {
  onNavigateToBrowse?: () => void
}

export function OrganizePage({ onNavigateToBrowse }: OrganizePageProps) {
  const sourceRoot = useLibraryWorkspaceStore((state) => state.sourceRoot)
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setSourceRoot = useLibraryWorkspaceStore((state) => state.setSourceRoot)
  const setOutputRoot = useLibraryWorkspaceStore((state) => state.setOutputRoot)
  const setLastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.setLastLoadedIndex
  )
  const [isScanning, setIsScanning] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
  const [previewResult, setPreviewResult] =
    useState<PreviewPendingOrganizationResult | null>(null)
  const [groupTitleInputs, setGroupTitleInputs] = useState<
    Record<string, string>
  >({})
  const [groupCompanionsInputs, setGroupCompanionsInputs] = useState<
    Record<string, string>
  >({})
  const [groupNotesInputs, setGroupNotesInputs] = useState<
    Record<string, string>
  >({})
  const [previewImageLoadFailedByPhotoId, setPreviewImageLoadFailedByPhotoId] =
    useState<Record<string, boolean>>({})

  const hasPendingPreviewGroups = (previewResult?.groups.length ?? 0) > 0
  const previewMetadataOverrideEntries = useMemo(
    () =>
      (previewResult?.groups ?? [])
        .map((group) => ({
          groupKey: group.groupKey,
          title: groupTitleInputs[group.groupKey]?.trim() ?? '',
          companions: (groupCompanionsInputs[group.groupKey] ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
          notes: groupNotesInputs[group.groupKey]?.trim() || undefined
        }))
        .filter((entry) => entry.title.length > 0),
    [
      groupCompanionsInputs,
      groupNotesInputs,
      groupTitleInputs,
      previewResult?.groups
    ]
  )

  async function selectSourceRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      SOURCE_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setSourceRoot(selectedPath)
      setPreviewResult(null)
      setGroupTitleInputs({})
      setGroupCompanionsInputs({})
      setGroupNotesInputs({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setErrorMessage(null)
    }
  }

  async function selectOutputRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      OUTPUT_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setOutputRoot(selectedPath)
      setLastLoadedIndex(null)
      setPreviewResult(null)
      setGroupTitleInputs({})
      setGroupCompanionsInputs({})
      setGroupNotesInputs({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setErrorMessage(null)
    }
  }

  async function handlePreview(): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
      return
    }

    setIsLoadingPreview(true)
    setErrorMessage(null)

    try {
      const nextPreview = await window.photoApp.previewPendingOrganization({
        sourceRoot,
        outputRoot
      })

      setPreviewResult(nextPreview)
      setPreviewImageLoadFailedByPhotoId({})
      setGroupTitleInputs(
        Object.fromEntries(
          nextPreview.groups.map((group) => [
            group.groupKey,
            group.suggestedTitles[0] ?? group.displayTitle
          ])
        )
      )
      setGroupCompanionsInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )
      setGroupNotesInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '신규 정리 후보를 불러오지 못했습니다.'
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }

  async function handleScan(): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
      return
    }

    setIsScanning(true)
    setErrorMessage(null)

    try {
      const nextSummary = await window.photoApp.scanPhotoLibrary({
        sourceRoot,
        outputRoot,
        groupMetadataOverrides: previewMetadataOverrideEntries
      })
      const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })

      setSummary(nextSummary)
      setLastLoadedIndex(loadedIndex)
      setPreviewResult(null)
      setGroupTitleInputs({})
      setGroupCompanionsInputs({})
      setGroupNotesInputs({})
      setPreviewImageLoadFailedByPhotoId({})
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
      )
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          사진 정리 실행
        </h1>
        <p className="text-base leading-7 text-slate-600">
          원본 사진 폴더와 출력 폴더를 선택한 뒤 정리를 실행하세요. 정리
          페이지는 스캔, EXIF 읽기, 중복 검사, 복사, 인덱스 생성 결과를
          확인하는 데 집중합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              원본 사진 폴더
            </h2>
            <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {sourceRoot || '아직 선택되지 않았습니다.'}
            </p>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectSourceRoot()}
            >
              원본 폴더 선택
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
            <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {outputRoot || '아직 선택되지 않았습니다.'}
            </p>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!previewResult ? (
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoadingPreview || isScanning}
            onClick={() => void handlePreview()}
          >
            {isLoadingPreview ? '후보 불러오는 중...' : '정리 시작하기'}
          </button>
        ) : (
          <>
            {hasPendingPreviewGroups ? (
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isScanning}
                onClick={() => void handleScan()}
              >
                {isScanning ? '정리 중...' : '저장하기'}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={isLoadingPreview || isScanning}
              onClick={() => void handlePreview()}
            >
              후보 다시 불러오기
            </button>
          </>
        )}
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          disabled={!outputRoot}
          onClick={onNavigateToBrowse}
        >
          조회 페이지 열기
        </button>
        <p className="text-sm text-slate-500">
          정리 시작하기를 누르면 신규 후보를 먼저 검토하고, 메타 정보를 입력한
          뒤 저장할 수 있습니다.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {previewResult ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-sky-900">
                  신규 정리 후보 검토
                </h2>
                <p className="text-sm text-sky-800">
                  신규 정리 대상 {previewResult.pendingPhotoCount}장, 기존 중복
                  스킵 예정 {previewResult.skippedExistingCount}장
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700">
                스캔 후보 {previewResult.scannedCount}장
              </div>
            </div>

            {hasPendingPreviewGroups ? (
              <div className="space-y-4">
                {previewResult.groups.map((group) => (
                  <article
                    key={group.groupKey}
                    className="rounded-xl border border-sky-200 bg-white p-4"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {group.displayTitle}
                          </h3>
                          <p className="text-sm text-slate-600">
                            사진 {group.photoCount}장
                            {group.representativeGps ? ' · GPS 기반 그룹' : ' · GPS 없음'}
                          </p>
                        </div>
                        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                          {group.groupKey}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {group.representativePhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                          >
                            {photo.previewDataUrl &&
                            !previewImageLoadFailedByPhotoId[photo.id] ? (
                              <img
                                src={photo.previewDataUrl}
                                alt={photo.sourceFileName}
                                className="h-36 w-full object-cover"
                                onError={() =>
                                  setPreviewImageLoadFailedByPhotoId((current) => ({
                                    ...current,
                                    [photo.id]: true
                                  }))
                                }
                              />
                            ) : (
                              <div className="flex h-36 items-center justify-center bg-slate-200 px-3 text-center text-sm text-slate-500">
                                미리보기를 불러오지 못했습니다.
                              </div>
                            )}
                            <div className="space-y-1 px-3 py-2">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {photo.sourceFileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {photo.capturedAtIso ?? '촬영 시각 없음'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800">
                            추천 그룹명
                          </p>
                          {group.suggestedTitles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {group.suggestedTitles.map((title) => (
                                <button
                                  key={title}
                                  type="button"
                                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                  onClick={() =>
                                    setGroupTitleInputs((current) => ({
                                      ...current,
                                      [group.groupKey]: title
                                    }))
                                  }
                                >
                                  {title}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              근처 GPS 범위에서 기존 그룹명이 없어 기본 그룹명을
                              사용합니다.
                            </p>
                          )}
                        </div>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            정리할 그룹명
                          </span>
                          <input
                            value={groupTitleInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupTitleInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder={group.displayTitle}
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            동행인
                          </span>
                          <input
                            value={groupCompanionsInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupCompanionsInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder="예: Alice, Bob"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            메모
                          </span>
                          <textarea
                            value={groupNotesInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupNotesInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder="이 그룹에 대한 메모를 남겨두세요."
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-sky-300 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  새로 정리할 파일이 없습니다.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  현재 원본 폴더의 파일은 출력 폴더에 이미 있거나 중복으로
                  판단되었습니다.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-emerald-900">
                실행 결과
              </h2>
              <button
                type="button"
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
                onClick={onNavigateToBrowse}
              >
                결과 조회로 이동
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">스캔 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.scannedCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">유지 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.keptCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">신규 복사 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.copiedCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">중복 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.duplicateCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">기존 중복 스킵 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedExistingCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">그룹 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.groupCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">경고 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.warningCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">실패 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.failureCount}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
