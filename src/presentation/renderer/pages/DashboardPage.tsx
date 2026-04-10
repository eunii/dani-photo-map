import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Input } from '@heroui/react'

import { SearchIcon } from '@presentation/renderer/components/app/AppIcons'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import {
  buildDashboardFolderRows,
  countRowsWithUnknownLocation,
  filterDashboardFolderRows
} from '@presentation/renderer/view-models/dashboardFolderRows'

const PAGE_SIZE = 80

interface DashboardPageProps {
  onNavigateToBrowse: () => void
  onNavigateToFilesPath: (pathSegments: string[]) => void
  onNavigateToOrganize: () => void
  onNavigateToSettings?: () => void
}

function formatGeneratedAtLabel(value?: string): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function SummaryCard({
  label,
  value,
  description,
  valueClassName
}: {
  label: string
  value: string
  description: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--app-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 font-semibold tracking-tight text-[var(--app-foreground)] ${
          valueClassName ?? 'text-[24px]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--app-muted)]">{description}</p>
    </div>
  )
}

export function DashboardPage({
  onNavigateToBrowse,
  onNavigateToFilesPath,
  onNavigateToOrganize,
  onNavigateToSettings
}: DashboardPageProps) {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage
  } = useOutputLibraryIndexPanel()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<'all' | string>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  const groups = libraryIndex?.groups ?? []
  const loadSourceBadge = getLoadSourceBadge(loadSource)

  const allRows = useMemo(() => buildDashboardFolderRows(groups), [groups])
  const yearOptions = useMemo(() => {
    const years = [...new Set(allRows.map((row) => row.yearSegment))]

    return years.sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [allRows])
  const searchFilteredRows = useMemo(
    () => filterDashboardFolderRows(allRows, searchQuery),
    [allRows, searchQuery]
  )
  const filteredRows = useMemo(() => {
    if (selectedYear === 'all') {
      return searchFilteredRows
    }

    return searchFilteredRows.filter((row) => row.yearSegment === selectedYear)
  }, [searchFilteredRows, selectedYear])
  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  )
  const hasMoreRows = visibleCount < filteredRows.length

  const summary = useMemo(() => {
    const totalPhotoCount = groups.reduce((sum, group) => sum + group.photoCount, 0)
    const unknownGroupCount = groups.filter((group) => group.isUnknownLocation).length
    const unknownRowCount = countRowsWithUnknownLocation(groups, allRows)

    return {
      totalGroupCount: groups.length,
      totalPhotoCount,
      unknownGroupCount,
      unknownRowCount
    }
  }, [allRows, groups])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, selectedYear, groups.length])

  useEffect(() => {
    const node = loadMoreSentinelRef.current

    if (!node || !hasMoreRows) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]

        if (firstEntry?.isIntersecting) {
          setVisibleCount((current) =>
            Math.min(current + PAGE_SIZE, filteredRows.length)
          )
        }
      },
      {
        root: null,
        rootMargin: '240px',
        threshold: 0
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [filteredRows.length, hasMoreRows])

  if (!outputRoot) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-[18px] bg-[var(--app-surface)] px-6 py-8 text-center">
        <p className="text-base font-semibold text-[var(--app-foreground)]">
          출력 폴더를 먼저 설정하세요.
        </p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
          메인 대시보드는 정리된 라이브러리의 폴더 구조와 대표 썸네일을
          요약해서 보여줍니다. 설정에서 출력 폴더를 지정하면 바로 사용할 수
          있습니다.
        </p>
        {onNavigateToSettings ? (
          <Button
            variant="primary"
            className="mt-4 rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
            onPress={onNavigateToSettings}
          >
            설정으로 이동
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="전체 그룹"
              value={summary.totalGroupCount.toLocaleString()}
              description="라이브러리에 저장된 그룹 수"
            />
            <SummaryCard
              label="전체 사진"
              value={summary.totalPhotoCount.toLocaleString()}
              description="하위 폴더를 포함한 전체 사진 수"
            />
            <SummaryCard
              label="위치 미확인 그룹"
              value={summary.unknownGroupCount.toLocaleString()}
              description="검토가 필요한 그룹 수"
            />
            <SummaryCard
              label="마지막 갱신"
              value={formatGeneratedAtLabel(libraryIndex?.generatedAt)}
              description={`검색 결과 ${filteredRows.length.toLocaleString()}개 경로`}
              valueClassName="text-[14px] leading-6"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
              onPress={onNavigateToOrganize}
            >
              새 사진 정리
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
              onPress={onNavigateToBrowse}
            >
              지도 보기
            </Button>
            {loadSourceBadge ? (
              <div
                className={`rounded-full border px-2.5 py-1 text-[11px] ${loadSourceBadge.tone}`}
                title={loadSourceBadge.description}
              >
                {loadSourceBadge.label}
              </div>
            ) : null}
            <div className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]">
              위치 미확인 경로 {summary.unknownRowCount.toLocaleString()}개
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3 xl:min-w-[340px]">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[var(--app-muted)]">
              <SearchIcon className="h-3.5 w-3.5" />
              폴더 검색
            </span>
            <Input
              aria-label="폴더 경로 검색"
              placeholder="예: 서울, 2024 > 12, seoul"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)]"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
            전체 경로 문자열 기준으로 like 검색합니다. `서울`을 입력하면
            `2023 &gt; 01 &gt; 서울`, `2034 &gt; 12 &gt; 서울숲` 같은 항목이
            함께 나옵니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button
              variant={selectedYear === 'all' ? 'primary' : 'ghost'}
              className={`h-8 rounded-full px-3 text-xs ${
                selectedYear === 'all'
                  ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                  : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]'
              }`}
              onPress={() => setSelectedYear('all')}
            >
              전체
            </Button>
            {yearOptions.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? 'primary' : 'ghost'}
                className={`h-8 rounded-full px-3 text-xs ${
                  selectedYear === year
                    ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                    : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]'
                }`}
                onPress={() => setSelectedYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="grid shrink-0 grid-cols-[64px_minmax(0,1fr)_92px] gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">
          <span>대표</span>
          <span>폴더 전체 경로</span>
          <span className="text-right">사진 수</span>
        </div>

        {!libraryIndex && isLoadingIndex ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-[var(--app-muted)]">
            라이브러리 인덱스를 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-[var(--app-danger)]">
            {errorMessage}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-[var(--app-muted)]">
            {searchQuery.trim()
              ? '검색어와 일치하는 폴더 경로가 없습니다.'
              : '표시할 폴더 경로가 없습니다.'}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-[var(--app-border)]">
              {visibleRows.map((row) => {
                const thumbnailUrl = toOutputFileUrl(
                  outputRoot,
                  row.representativeThumbnailRelativePath
                )

                return (
                  <button
                    key={row.pathSegments.join('\x1e')}
                    type="button"
                    className="grid w-full grid-cols-[64px_minmax(0,1fr)_92px] gap-3 px-4 py-3 text-left transition hover:bg-[var(--app-surface-strong)]"
                    onClick={() => onNavigateToFilesPath(row.pathSegments)}
                  >
                    <div className="flex items-center justify-center">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-[var(--app-surface-strong)]">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={row.fullPathLabel}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--app-muted)]">
                            없음
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--app-foreground)]">
                        {row.fullPathLabel}
                      </p>
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="text-sm font-semibold text-[var(--app-foreground)]">
                        {row.photoCount.toLocaleString()}
                      </span>
                    </div>
                  </button>
                )
              })}
              {hasMoreRows ? (
                <div
                  ref={loadMoreSentinelRef}
                  className="px-4 py-4 text-center text-xs text-[var(--app-muted)]"
                >
                  더 많은 폴더를 불러오는 중입니다.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
