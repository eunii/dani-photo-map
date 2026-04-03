import { useEffect, useMemo, useState } from 'react'

import { GroupDetailPanel } from '@presentation/renderer/components/GroupDetailPanel'
import { GroupListPanel } from '@presentation/renderer/components/GroupListPanel'
import { GroupsMap } from '@presentation/renderer/components/GroupsMap'
import {
  buildGroupExplorerViewModel,
  type GroupSortOption
} from '@presentation/renderer/view-models/groupExplorer'
import { buildGroupTitleSuggestions } from '@presentation/renderer/view-models/groupTitleSuggestions'
import type {
  AppInfo,
  LibraryIndexView,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'

const STORAGE_KEYS = {
  sourceRoot: 'photo-organizer/source-root',
  outputRoot: 'photo-organizer/output-root'
} as const

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

function readStoredPath(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function persistPath(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    void key
    void value
  }
}

export function HomePage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [sourceRoot, setSourceRoot] = useState(() =>
    readStoredPath(STORAGE_KEYS.sourceRoot)
  )
  const [outputRoot, setOutputRoot] = useState(() =>
    readStoredPath(STORAGE_KEYS.outputRoot)
  )
  const [isScanning, setIsScanning] = useState(false)
  const [isLoadingIndex, setIsLoadingIndex] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
  const [libraryIndex, setLibraryIndex] = useState<LibraryIndexView | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [hoveredGroupId, setHoveredGroupId] = useState<string | undefined>()
  const [groupSortOption, setGroupSortOption] = useState<GroupSortOption>('recent')

  const selectedGroup = useMemo(
    () => libraryIndex?.groups.find((group) => group.id === selectedGroupId),
    [libraryIndex?.groups, selectedGroupId]
  )
  const explorerViewModel = useMemo(
    () =>
      buildGroupExplorerViewModel(libraryIndex?.groups ?? [], groupSortOption),
    [groupSortOption, libraryIndex?.groups]
  )
  const titleSuggestions = useMemo(
    () => buildGroupTitleSuggestions(selectedGroup, libraryIndex?.groups ?? []),
    [libraryIndex?.groups, selectedGroup]
  )

  useEffect(() => {
    void window.photoApp.getAppInfo().then(setAppInfo)
  }, [])

  useEffect(() => {
    persistPath(STORAGE_KEYS.sourceRoot, sourceRoot)
  }, [sourceRoot])

  useEffect(() => {
    persistPath(STORAGE_KEYS.outputRoot, outputRoot)
  }, [outputRoot])

  useEffect(() => {
    if (!outputRoot) {
      setLibraryIndex(null)
      setSelectedGroupId(undefined)
      setHoveredGroupId(undefined)
      return
    }

    setIsLoadingIndex(true)
    setErrorMessage(null)

    void window.photoApp
      .loadLibraryIndex({ outputRoot })
      .then((loadedIndex) => {
        setLibraryIndex(loadedIndex)
        setSelectedGroupId(loadedIndex?.groups[0]?.id)
        setHoveredGroupId(undefined)
      })
      .catch((error) => {
        setLibraryIndex(null)
        setSelectedGroupId(undefined)
        setHoveredGroupId(undefined)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '저장된 index.json을 불러오지 못했습니다.'
        )
      })
      .finally(() => {
        setIsLoadingIndex(false)
      })
  }, [outputRoot])

  async function selectSourceRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      SOURCE_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setSourceRoot(selectedPath)
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
      setSummary(null)
      setErrorMessage(null)
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
        outputRoot
      })
      const nextLibraryIndex = await window.photoApp.loadLibraryIndex({ outputRoot })

      setSummary(nextSummary)
      setLibraryIndex(nextLibraryIndex)
      setSelectedGroupId(nextLibraryIndex?.groups[0]?.id)
      setHoveredGroupId(undefined)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
      )
    } finally {
      setIsScanning(false)
    }
  }

  async function handleSaveGroup(nextGroup: {
    title: string
    companions: string[]
    notes?: string
    representativePhotoId?: string
  }): Promise<void> {
    if (!outputRoot || !selectedGroup) {
      return
    }

    setIsSavingGroup(true)
    setErrorMessage(null)

    try {
      const updatedIndex = await window.photoApp.updatePhotoGroup({
        outputRoot,
        groupId: selectedGroup.id,
        title: nextGroup.title,
        companions: nextGroup.companions,
        notes: nextGroup.notes,
        representativePhotoId: nextGroup.representativePhotoId
      })

      setLibraryIndex(updatedIndex)
      setSelectedGroupId(selectedGroup.id)
      setHoveredGroupId(undefined)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '그룹 저장에 실패했습니다.'
      )
    } finally {
      setIsSavingGroup(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="w-full max-w-7xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              {appInfo ? `${appInfo.name} ${appInfo.version}` : 'Photo Organizer MVP'}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              로컬 사진 폴더 정리 준비가 되었습니다.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              원본 사진 폴더와 출력 폴더를 선택한 뒤 정리를 실행하세요. 현재는
              MVP 초기 흐름으로 스캔, EXIF 읽기, 중복 검사, 복사, 인덱스 생성을
              연결해 둔 상태입니다.
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
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isScanning}
              onClick={() => void handleScan()}
            >
              {isScanning ? '정리 중...' : '사진 정리 실행'}
            </button>
            <p className="text-sm text-slate-500">
              EXIF 메타데이터 읽기, SHA-256 중복 검사, 결과 복사 및 `index.json`
              생성까지 실행합니다.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {summary ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-emerald-900">
                  실행 결과
                </h2>
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
                    <p className="text-xs text-slate-500">중복 수</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {summary.duplicateCount}
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

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                그룹 탐색 및 편집
              </h2>
              <p className="text-xs text-slate-500">
                저장된 `index.json`을 기준으로 그룹을 다시 불러오고 편집합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                지도 가능 그룹 {explorerViewModel.mappedGroups.length}
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                GPS 없는 그룹 {explorerViewModel.unmappedGroups.length}
              </div>
              <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                정렬
                <select
                  value={groupSortOption}
                  onChange={(event) =>
                    setGroupSortOption(event.target.value as GroupSortOption)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                >
                  <option value="recent">최근 촬영 순</option>
                  <option value="photo-count">사진 많은 순</option>
                  <option value="title">제목 순</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)_minmax(360px,1fr)]">
              <GroupsMap
                groups={explorerViewModel.mappedGroups
                  .map((group) =>
                    libraryIndex?.mapGroups.find(
                      (mapGroup) => mapGroup.id === group.id
                    )
                  )
                  .filter((group) => group !== undefined)}
                outputRoot={libraryIndex?.outputRoot}
                selectedGroupId={selectedGroupId}
                hoveredGroupId={hoveredGroupId}
                onSelectGroup={setSelectedGroupId}
                onHoverGroup={setHoveredGroupId}
              />
              <div className="space-y-4">
                <GroupListPanel
                  title="지도 그룹"
                  description="GPS가 있는 그룹입니다. hover와 선택이 지도와 연동됩니다."
                  groups={explorerViewModel.mappedGroups}
                  selectedGroupId={selectedGroupId}
                  hoveredGroupId={hoveredGroupId}
                  onSelectGroup={setSelectedGroupId}
                  onHoverGroup={setHoveredGroupId}
                />
                <GroupListPanel
                  title="GPS 없는 그룹"
                  description="지도에는 보이지 않지만 상세 패널에서 편집할 수 있습니다."
                  groups={explorerViewModel.unmappedGroups}
                  selectedGroupId={selectedGroupId}
                  hoveredGroupId={hoveredGroupId}
                  onSelectGroup={setSelectedGroupId}
                  onHoverGroup={setHoveredGroupId}
                />
              </div>
              <GroupDetailPanel
                group={selectedGroup}
                titleSuggestions={titleSuggestions}
                outputRoot={libraryIndex?.outputRoot}
                isSaving={isSavingGroup}
                onSave={handleSaveGroup}
              />
            </div>
            {isLoadingIndex ? (
              <p className="text-sm text-slate-500">
                저장된 인덱스를 불러오는 중입니다...
              </p>
            ) : null}
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Photo Organizer MVP
            <br />
            원본 파일은 수정하지 않고 복사 기준으로 처리합니다. 물리 폴더는
            `year / month / region` 구조를 사용하고, 논리 그룹은
            `.photo-organizer/index.json`에 저장됩니다.
          </div>
        </div>
      </section>
    </main>
  )
}