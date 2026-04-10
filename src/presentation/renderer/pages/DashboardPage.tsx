import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Input } from '@heroui/react'

import {
  ChevronRightIcon,
  KpiClockIcon,
  KpiGroupsIcon,
  KpiLocationUnknownIcon,
  KpiPhotosIcon,
  MapIcon,
  SearchIcon
} from '@presentation/renderer/components/app/AppIcons'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { DashboardFolderRow } from '@presentation/renderer/view-models/dashboardFolderRows'
import {
  buildDashboardFolderRows,
  countRowsWithUnknownLocation,
  filterDashboardFolderRows
} from '@presentation/renderer/view-models/dashboardFolderRows'

const PAGE_SIZE = 48

/** 폴더 인덱스 테이블: 대표 · 경로·제목 · 지역 · 촬영 · GPS · 지도 · 동행 · 메모 · 장수 · 이동 */
const FOLDER_INDEX_GRID_CLASS =
  'grid grid-cols-[56px_minmax(200px,1.35fr)_minmax(76px,0.48fr)_minmax(112px,0.62fr)_minmax(96px,0.58fr)_40px_minmax(92px,0.52fr)_36px_minmax(52px,auto)_28px] items-center gap-x-2'

function formatShortDate(iso?: string): string {
  if (!iso) {
    return ''
  }

  const parsed = new Date(iso)

  if (Number.isNaN(parsed.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsed)
}

function formatCaptureRange(earliest?: string, latest?: string): string {
  if (!earliest && !latest) {
    return '—'
  }

  const start = formatShortDate(earliest ?? latest)
  const end = formatShortDate(latest ?? earliest)

  if (!earliest || !latest || earliest === latest) {
    return start || '—'
  }

  return `${start} ~ ${end}`
}

function formatGpsSummary(row: DashboardFolderRow): string {
  if (row.isUnknownLocation) {
    return '미확인'
  }

  const { exactGpsCount, inferredGpsCount, missingGpsCount } = row.gpsBreakdown

  return `원${exactGpsCount}·추${inferredGpsCount}·없${missingGpsCount}`
}

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

  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}

function SummaryCard({
  label,
  value,
  description,
  valueClassName,
  icon
}: {
  label: string
  value: string
  description: string
  valueClassName?: string
  icon?: ReactNode
}) {
  return (
    <div className="app-surface-card rounded-[20px] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
          {label}
        </p>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-surface-strong)] text-[var(--app-accent-strong)]">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={`mt-1.5 font-semibold tracking-tight text-[var(--app-foreground)] ${
          valueClassName ?? 'text-[22px]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
        {description}
      </p>
    </div>
  )
}

function YearBar({
  year,
  photoCount,
  ratio,
  isSelected,
  compact,
  onPress
}: {
  year: string
  photoCount: number
  ratio: number
  isSelected: boolean
  compact?: boolean
  onPress: () => void
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-[16px] px-3 text-left transition ${
        compact ? 'py-1.5' : 'py-2'
      } ${
        isSelected
          ? 'bg-[var(--app-surface-strong)]'
          : 'hover:bg-[var(--app-surface-strong)]'
      }`}
      onClick={onPress}
    >
      <div
        className={`flex items-center justify-between gap-3 ${
          compact ? 'mb-1' : 'mb-1.5'
        }`}
      >
        <span
          className={`font-medium text-[var(--app-foreground)] ${
            compact ? 'text-[13px]' : 'text-sm'
          }`}
        >
          {year}
        </span>
        <span
          className={`text-[var(--app-muted)] ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {photoCount.toLocaleString()}장
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-[var(--app-surface-strong)] ${
          compact ? 'h-1' : 'h-1.5'
        }`}
      >
        <div
          className="h-full rounded-full bg-[var(--app-accent)]"
          style={{ width: `${Math.max(8, ratio * 100)}%` }}
        />
      </div>
    </button>
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

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
  const yearPhotoStats = useMemo(() => {
    const counts = new Map<string, number>()

    for (const row of allRows) {
      counts.set(row.yearSegment, (counts.get(row.yearSegment) ?? 0) + row.photoCount)
    }

    return [...counts.entries()]
      .map(([year, photoCount]) => ({ year, photoCount }))
      .sort((left, right) =>
        right.year.localeCompare(left.year, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      )
  }, [allRows])
  const maxYearPhotoCount = yearPhotoStats[0]?.photoCount ?? 1
  const yearChartCompact = yearPhotoStats.length > 10

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
        root: scrollContainerRef.current,
        rootMargin: '180px',
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
      <div className="app-surface-card flex h-full min-h-0 flex-col items-center justify-center rounded-[20px] px-6 py-8 text-center">
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
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <div className="grid min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-stretch">
        <section className="app-surface-card app-grid-dots relative min-h-0 overflow-hidden rounded-[24px] px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_40%)]" />
          <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent-strong)]">
                Home
              </div>
              <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[var(--app-foreground)]">
                사진 라이브러리 홈
              </h2>
              <p className="mt-2 max-w-[44rem] text-[13px] leading-6 text-[var(--app-muted)]">
                연도별로 정리된 최하위 폴더를 빠르게 훑고, 원하는 위치를 클릭해서
                바로 파일 목록으로 들어갈 수 있습니다.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  className="h-9 rounded-xl bg-[var(--app-button)] px-3.5 text-[13px] text-[var(--app-button-foreground)]"
                  onPress={onNavigateToOrganize}
                >
                  새 사진 정리
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 text-[13px] text-[var(--app-foreground)]"
                  onPress={onNavigateToBrowse}
                >
                  지도 보기
                </Button>
                <div className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]">
                  위치 미확인 경로 {summary.unknownRowCount.toLocaleString()}개
                </div>
                {loadSourceBadge ? (
                  <div
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${loadSourceBadge.tone}`}
                    title={loadSourceBadge.description}
                  >
                    {loadSourceBadge.label}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--app-border)] bg-[color:color-mix(in_srgb,var(--app-surface-strong)_72%,white_28%)] p-3.5">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  <SearchIcon className="h-3.5 w-3.5" />
                  폴더 검색
                </span>
                <Input
                  aria-label="폴더 경로 검색"
                  placeholder="예: 서울, 2024 > 12, seoul"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                />
              </label>
              <p className="mt-2 text-[11px] leading-5 text-[var(--app-muted)]">
                전체 경로를 기준으로 like 검색합니다.
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
        </section>

        <section className="app-surface-card flex min-h-0 max-h-[min(42vh,320px)] flex-col rounded-[24px] px-4 py-4 xl:max-h-[min(52vh,420px)] xl:min-h-[200px]">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                Year Volume
              </p>
              <h3 className="mt-1 text-[17px] font-semibold text-[var(--app-foreground)]">
                연도별 사진 분포
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-[var(--app-muted)]">
                연도 {yearPhotoStats.length}개
                {yearPhotoStats.length > 8
                  ? ' · 긴 기간은 목록을 스크롤하거나 상단 연도 칩으로 바로 이동하세요.'
                  : ' · 아래에서 연도별 비중을 확인할 수 있습니다.'}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]">
              {selectedYear === 'all' ? '전체 보기' : `${selectedYear}년 선택`}
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:color-mix(in_srgb,var(--app-border)_70%,transparent)]">
            <div className="space-y-1.5 pb-0.5">
              {yearPhotoStats.map((item) => (
                <YearBar
                  key={item.year}
                  year={item.year}
                  photoCount={item.photoCount}
                  ratio={item.photoCount / maxYearPhotoCount}
                  isSelected={selectedYear === item.year}
                  compact={yearChartCompact}
                  onPress={() => setSelectedYear(item.year)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="전체 그룹"
          value={summary.totalGroupCount.toLocaleString()}
          description="라이브러리에 저장된 그룹"
          icon={<KpiGroupsIcon className="h-4 w-4" />}
        />
        <SummaryCard
          label="전체 사진"
          value={summary.totalPhotoCount.toLocaleString()}
          description="현재 출력 라이브러리 총 사진 수"
          icon={<KpiPhotosIcon className="h-4 w-4" />}
        />
        <SummaryCard
          label="위치 미확인"
          value={summary.unknownGroupCount.toLocaleString()}
          description="GPS 검토가 필요한 그룹"
          icon={<KpiLocationUnknownIcon className="h-4 w-4" />}
        />
        <SummaryCard
          label="마지막 갱신"
          value={formatGeneratedAtLabel(libraryIndex?.generatedAt)}
          description={`${filteredRows.length.toLocaleString()}개 폴더 표시 중`}
          valueClassName="text-[13px] leading-6"
          icon={<KpiClockIcon className="h-4 w-4" />}
        />
      </div>

      <section className="app-surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] px-3.5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
              Folder Index
            </p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-[var(--app-foreground)]">
              사진이 있는 폴더
            </h3>
          </div>
          <div className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]">
            {visibleRows.length.toLocaleString()} / {filteredRows.length.toLocaleString()}
          </div>
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
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto"
          >
            <div className="min-w-[1040px] px-2.5 pb-2.5 pt-1">
              <div
                className={`sticky top-0 z-[1] border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)] ${FOLDER_INDEX_GRID_CLASS}`}
              >
                <span>대표</span>
                <span>경로 · 제목</span>
                <span>지역</span>
                <span>촬영</span>
                <span>위치</span>
                <span className="text-center">지도</span>
                <span>동행</span>
                <span className="text-center">메모</span>
                <span className="text-right">장수</span>
                <span className="sr-only">이동</span>
              </div>

              <div className="mt-1.5 space-y-1.5">
              {visibleRows.map((row) => {
                const thumbnailUrl = toOutputFileUrl(
                  outputRoot,
                  row.representativeThumbnailRelativePath
                )

                return (
                  <button
                    key={row.pathSegments.join('\x1e')}
                    type="button"
                    className={`group w-full min-w-[1040px] rounded-[18px] border border-[var(--app-border)] bg-[color:color-mix(in_srgb,var(--app-surface)_92%,white_8%)] px-3 py-2.5 text-left transition hover:-translate-y-[1px] hover:bg-[var(--app-surface-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${FOLDER_INDEX_GRID_CLASS}`}
                    onClick={() => onNavigateToFilesPath(row.pathSegments)}
                  >
                    <div className="flex items-center justify-center self-start pt-0.5">
                      <div className="h-11 w-11 overflow-hidden rounded-[12px] bg-[var(--app-surface-strong)] ring-1 ring-[color:color-mix(in_srgb,var(--app-border)_55%,transparent)] transition group-hover:ring-[var(--app-accent)]">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={row.fullPathLabel}
                            className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-110"
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
                      <p className="truncate text-[12px] font-medium text-[var(--app-foreground)]">
                        {row.fullPathLabel}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">
                        {row.displayTitle || '—'}
                      </p>
                    </div>

                    <div className="min-w-0 truncate text-[11px] text-[var(--app-foreground)]">
                      {row.regionLabel || '—'}
                    </div>

                    <div className="whitespace-nowrap text-[11px] tabular-nums text-[var(--app-foreground)]">
                      {formatCaptureRange(
                        row.earliestCapturedAtIso,
                        row.latestCapturedAtIso
                      )}
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                          row.isUnknownLocation
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                            : 'bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
                        }`}
                        title={formatGpsSummary(row)}
                      >
                        {formatGpsSummary(row)}
                      </span>
                    </div>

                    <div className="flex justify-center text-[var(--app-muted)]">
                      {row.hasMapPin ? (
                        <MapIcon
                          className="h-4 w-4 text-[var(--app-accent-strong)]"
                          title="지도에 표시 가능"
                        />
                      ) : (
                        <span className="text-[11px]">—</span>
                      )}
                    </div>

                    <div className="min-w-0 truncate text-[11px] text-[var(--app-foreground)]">
                      {row.companionsShort}
                    </div>

                    <div className="flex justify-center">
                      {row.hasNotes ? (
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface-strong)] text-[13px] leading-none text-[var(--app-accent-strong)]"
                          title="메모 있음"
                        >
                          ···
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--app-muted)]">—</span>
                      )}
                    </div>

                    <div className="text-right tabular-nums">
                      <span className="text-[13px] font-semibold text-[var(--app-foreground)]">
                        {row.photoCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-[var(--app-muted)] transition group-hover:text-[var(--app-accent-strong)]">
                      <ChevronRightIcon className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>
                  </button>
                )
              })}

              {hasMoreRows ? (
                <div
                  ref={loadMoreSentinelRef}
                  className="px-4 py-3 text-center text-[11px] text-[var(--app-muted)]"
                >
                  더 많은 폴더를 불러오는 중입니다.
                </div>
              ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
