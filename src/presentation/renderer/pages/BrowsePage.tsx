import { useEffect, useMemo, useState } from 'react'

import { GroupDetailPanel } from '@presentation/renderer/components/GroupDetailPanel'
import { GroupListPanel } from '@presentation/renderer/components/GroupListPanel'
import { GroupsMap } from '@presentation/renderer/components/GroupsMap'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import {
  buildGroupExplorerViewModel,
  type GroupSortOption
} from '@presentation/renderer/view-models/groupExplorer'
import { buildGroupTitleSuggestions } from '@presentation/renderer/view-models/groupTitleSuggestions'

export function BrowsePage() {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    setLastLoadedIndex,
    isLoadingIndex,
    errorMessage,
    setErrorMessage,
    selectOutputRoot,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()

  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [isMovingPhotos, setIsMovingPhotos] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [hoveredGroupId, setHoveredGroupId] = useState<string | undefined>()
  const [groupSortOption, setGroupSortOption] =
    useState<GroupSortOption>('recent')

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
  const sourceBadge = getLoadSourceBadge(loadSource)

  useEffect(() => {
    if (!outputRoot) {
      setSelectedGroupId(undefined)
      setHoveredGroupId(undefined)
    }
  }, [outputRoot])

  useEffect(() => {
    setHoveredGroupId(undefined)
  }, [libraryIndex?.generatedAt])

  useEffect(() => {
    const groups = libraryIndex?.groups ?? []

    if (groups.length === 0) {
      setSelectedGroupId(undefined)
      setHoveredGroupId(undefined)
      return
    }

    const selectedGroupStillExists = groups.some(
      (group) => group.id === selectedGroupId
    )

    if (!selectedGroupStillExists) {
      setSelectedGroupId(groups[0]?.id)
    }
  }, [libraryIndex?.groups, selectedGroupId])

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

      setLastLoadedIndex({
        source: 'merged',
        index: updatedIndex
      })
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

  async function handleMovePhotos(nextMove: {
    sourceGroupId: string
    destinationGroupId: string
    photoIds: string[]
  }): Promise<void> {
    if (!outputRoot) {
      return
    }

    setIsMovingPhotos(true)
    setErrorMessage(null)

    try {
      const updatedIndex = await window.photoApp.movePhotosToGroup({
        outputRoot,
        sourceGroupId: nextMove.sourceGroupId,
        destinationGroupId: nextMove.destinationGroupId,
        photoIds: nextMove.photoIds
      })

      setLastLoadedIndex({
        source: 'merged',
        index: updatedIndex
      })
      setSelectedGroupId(nextMove.destinationGroupId)
      setHoveredGroupId(undefined)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 이동에 실패했습니다.'
      )
    } finally {
      setIsMovingPhotos(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          조회 및 그룹 편집
        </h1>
        <p className="text-base leading-7 text-slate-600">
          선택한 출력 폴더에서 기존 결과를 바로 불러옵니다. `index.json`이
          있으면 우선 사용하고, 없거나 깨졌으면 출력 폴더를 스캔해 조회 가능한
          범위만 복구합니다.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
            <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {outputRoot || '아직 선택되지 않았습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!outputRoot || isLoadingIndex}
              onClick={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </button>
          </div>
        </div>
      </section>

      {sourceBadge ? (
        <section className={`rounded-xl border px-4 py-3 text-sm ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
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

        {!outputRoot ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">
              조회할 출력 폴더를 선택하세요.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              기존 정리 결과가 있는 폴더를 선택하면 지도와 그룹 패널을
              불러옵니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)_minmax(360px,1fr)]">
            <GroupsMap
              groups={libraryIndex?.mapGroups ?? []}
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
              allGroups={libraryIndex?.groups ?? []}
              titleSuggestions={titleSuggestions}
              outputRoot={libraryIndex?.outputRoot}
              loadSource={loadSource}
              isSaving={isSavingGroup}
              isMovingPhotos={isMovingPhotos}
              onSave={handleSaveGroup}
              onMovePhotos={handleMovePhotos}
            />
          </div>
        )}

        {isLoadingIndex ? (
          <p className="text-sm text-slate-500">
            출력 결과를 불러오는 중입니다...
          </p>
        ) : null}
      </section>
    </div>
  )
}
