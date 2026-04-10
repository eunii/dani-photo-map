import type { ReactNode } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  SearchField,
  Spinner,
  Text,
  Toolbar,
  Tooltip
} from '@heroui/react'

import {
  ChevronRightIcon,
  KpiClockIcon,
  KpiGroupsIcon,
  KpiLocationUnknownIcon,
  KpiPhotosIcon,
  MapIcon,
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
  icon,
  compact
}: {
  label: string
  value: string
  description: string
  valueClassName?: string
  icon?: ReactNode
  compact?: boolean
}) {
  return (
    <Card
      className={`app-surface-card border-0 shadow-none ${
        compact ? 'rounded-xl px-2 py-1.5' : 'rounded-[20px] px-4 py-3'
      }`}
    >
      <Card.Header
        className={`flex flex-row items-start justify-between gap-1.5 p-0 pb-0 ${compact ? '' : ''}`}
      >
        <Card.Title
          className={`font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)] ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {label}
        </Card.Title>
        {icon ? (
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg bg-[var(--app-surface-strong)] text-[var(--app-accent-strong)] ${
              compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'
            }`}
          >
            {icon}
          </span>
        ) : null}
      </Card.Header>
      <Card.Content className={`p-0 ${compact ? 'pt-0.5' : 'pt-2'}`}>
        <p
          className={`font-semibold tracking-tight text-[var(--app-foreground)] ${
            valueClassName ??
            (compact ? 'text-[16px] leading-tight' : 'text-[22px]')
          }`}
        >
          {value}
        </p>
        <Card.Description
          className={`leading-snug text-[var(--app-muted)] ${
            compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px] leading-5'
          }`}
        >
          {description}
        </Card.Description>
      </Card.Content>
    </Card>
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
      className={`w-full rounded-xl px-2 text-left transition ${
        compact ? 'py-1' : 'py-2'
      } ${
        isSelected
          ? 'bg-[var(--app-surface-strong)] ring-1 ring-[color:color-mix(in_srgb,var(--app-accent)_40%,transparent)]'
          : 'hover:bg-[var(--app-surface-strong)]'
      }`}
      onClick={onPress}
    >
      <div
        className={`flex items-center justify-between gap-3 ${
          compact ? 'mb-1' : 'mb-1.5'
        }`}
      >
        <Text
          size={compact ? 'sm' : 'base'}
          className="font-medium text-[var(--app-foreground)]"
        >
          {year}
        </Text>
        <Text
          size={compact ? 'xs' : 'sm'}
          className="tabular-nums text-[var(--app-muted)]"
        >
          {photoCount.toLocaleString()}장
        </Text>
      </div>
      <div
        className={`relative overflow-hidden rounded-full bg-[var(--app-surface-strong)] ${
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

type YearStat = { year: string; photoCount: number }

function YearVolumeTimeSeriesChart({
  stats,
  selectedYear,
  onSelectYear
}: {
  stats: YearStat[]
  selectedYear: 'all' | string
  onSelectYear: (year: string) => void
}) {
  const gradId = `spark-${useId().replace(/:/g, '')}`
  const chronological = useMemo(
    () =>
      [...stats].sort((a, b) =>
        a.year.localeCompare(b.year, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      ),
    [stats]
  )
  const maxCount = Math.max(1, ...chronological.map((s) => s.photoCount))
  const n = chronological.length

  if (n === 0) {
    return (
      <Text size="xs" className="text-[var(--app-muted)]">
        연도 데이터 없음
      </Text>
    )
  }

  const w = 120
  const h = 34
  const padX = 2
  const padY = 3
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const points = chronological.map((item, i) => {
    const x =
      n === 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW
    const y = padY + innerH - (item.photoCount / maxCount) * innerH
    return { ...item, x, y }
  })
  const linePts = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const bottomY = h - padY
  const first = points[0]
  const last = points[n - 1]
  const areaD =
    n > 1 && first && last
      ? `M ${first.x},${bottomY} L ${points.map((p) => `${p.x},${p.y}`).join(' ')} L ${last.x},${bottomY} Z`
      : ''

  return (
    <div className="flex w-full min-w-0 flex-col gap-0.5">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none h-8 w-full text-[var(--app-accent)]"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {n > 1 ? <path d={areaD} fill={`url(#${gradId})`} /> : null}
          {n > 1 ? (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linePts}
            />
          ) : first ? (
            <circle cx={first.x} cy={first.y} r="2.5" fill="currentColor" />
          ) : null}
          {points.map((p) => (
            <circle
              key={p.year}
              cx={p.x}
              cy={p.y}
              r={selectedYear === p.year ? 2.6 : 1.6}
              className="pointer-events-none"
              fill="var(--app-surface-strong)"
              stroke="currentColor"
              strokeWidth={selectedYear === p.year ? 1.1 : 0.7}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex min-h-[36px]">
          {chronological.map((item) => (
            <button
              key={item.year}
              type="button"
              className="min-w-0 flex-1 opacity-0"
              title={`${item.year}년 · ${item.photoCount.toLocaleString()}장`}
              aria-label={`${item.year}년 ${item.photoCount.toLocaleString()}장 선택`}
              onClick={() => onSelectYear(item.year)}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between gap-px px-0.5">
        {chronological.map((item) => (
          <button
            key={`lbl-${item.year}`}
            type="button"
            className={`min-w-0 flex-1 truncate text-center text-[8px] tabular-nums transition ${
              selectedYear === item.year
                ? 'font-semibold text-[var(--app-accent-strong)]'
                : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)]'
            }`}
            title={`${item.year}년 · ${item.photoCount.toLocaleString()}장`}
            onClick={() => onSelectYear(item.year)}
          >
            {item.year}
          </button>
        ))}
      </div>
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
  const maxYearPhotoCount = Math.max(
    1,
    ...yearPhotoStats.map((item) => item.photoCount)
  )
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
      <Card className="app-surface-card flex h-full min-h-0 flex-col items-center justify-center rounded-[20px] border-0 px-6 py-8 text-center shadow-none">
        <Card.Header className="flex flex-col items-center p-0">
          <Card.Title className="text-base font-semibold text-[var(--app-foreground)]">
            출력 폴더를 먼저 설정하세요.
          </Card.Title>
          <Card.Description className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
            메인 대시보드는 정리된 라이브러리의 폴더 구조와 대표 썸네일을
            요약해서 보여줍니다. 설정에서 출력 폴더를 지정하면 바로 사용할 수
            있습니다.
          </Card.Description>
        </Card.Header>
        {onNavigateToSettings ? (
          <Card.Footer className="mt-4 p-0">
            <Button
              variant="primary"
              className="rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
              onPress={onNavigateToSettings}
            >
              설정으로 이동
            </Button>
          </Card.Footer>
        ) : null}
      </Card>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="grid min-h-0 shrink-0 gap-1.5 xl:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:items-stretch">
        <Card className="app-surface-card app-grid-dots relative min-h-0 overflow-hidden rounded-[16px] border-0 shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_40%)]" />
          <Card.Content className="relative space-y-2 px-2 py-2">
            <Toolbar className="min-w-0 flex-wrap justify-end gap-1.5 border-0 p-0">
              <Button
                variant="primary"
                className="h-8 rounded-xl bg-[var(--app-button)] px-3 text-[12px] text-[var(--app-button-foreground)]"
                onPress={onNavigateToOrganize}
              >
                새 사진 정리
              </Button>
              <Button
                variant="ghost"
                className="h-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[12px] text-[var(--app-foreground)]"
                onPress={onNavigateToBrowse}
              >
                지도 보기
              </Button>
            </Toolbar>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <SummaryCard
                compact
                label="전체 그룹"
                value={summary.totalGroupCount.toLocaleString()}
                description="저장된 그룹"
                icon={<KpiGroupsIcon className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                compact
                label="전체 사진"
                value={summary.totalPhotoCount.toLocaleString()}
                description="총 사진 수"
                icon={<KpiPhotosIcon className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                compact
                label="위치 미확인"
                value={summary.unknownGroupCount.toLocaleString()}
                description="GPS 검토 그룹"
                icon={<KpiLocationUnknownIcon className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                compact
                label="마지막 갱신"
                value={formatGeneratedAtLabel(libraryIndex?.generatedAt)}
                description={`${filteredRows.length.toLocaleString()}개 폴더`}
                valueClassName="text-[13px] leading-snug"
                icon={<KpiClockIcon className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <Badge
                size="sm"
                variant="soft"
                className="rounded-full bg-[var(--app-surface-strong)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--app-muted)]"
              >
                위치 미확인 경로 {summary.unknownRowCount.toLocaleString()}개
              </Badge>
              {loadSourceBadge ? (
                <Badge
                  size="sm"
                  variant="soft"
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-normal ${loadSourceBadge.tone}`}
                  title={loadSourceBadge.description}
                >
                  {loadSourceBadge.label}
                </Badge>
              ) : null}
            </div>
          </Card.Content>
        </Card>

        <Card className="app-surface-card flex max-h-[min(26vh,220px)] min-h-0 flex-col rounded-[16px] border-0 shadow-none xl:max-h-[min(30vh,260px)]">
          <Card.Content className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
            <div className="flex shrink-0 items-center justify-end">
              <Badge size="sm" variant="soft" className="tabular-nums">
                {selectedYear === 'all' ? '전체' : `${selectedYear}년`}
              </Badge>
            </div>
            <div className="shrink-0 border-b border-[var(--app-border)] pb-1.5">
              <YearVolumeTimeSeriesChart
                stats={yearPhotoStats}
                selectedYear={selectedYear}
                onSelectYear={(year) => setSelectedYear(year)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:color-mix(in_srgb,var(--app-border)_70%,transparent)]">
              <div className="space-y-1 pb-0.5">
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
          </Card.Content>
        </Card>
      </div>

      <Card className="app-surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border-0 shadow-none">
        {!libraryIndex && isLoadingIndex ? (
          <Card.Content className="flex flex-1 flex-col items-center justify-center px-4 py-10">
            <Spinner size="lg" />
            <Text className="mt-3 text-sm text-[var(--app-muted)]">
              라이브러리 인덱스를 불러오는 중입니다.
            </Text>
          </Card.Content>
        ) : errorMessage ? (
          <Card.Content className="flex flex-1 items-center justify-center px-4 py-10">
            <Text className="text-sm text-[var(--app-danger)]">{errorMessage}</Text>
          </Card.Content>
        ) : (
          <>
            <Toolbar className="min-w-0 shrink-0 flex-col flex-wrap gap-1.5 border-b border-[var(--app-border)] px-2 py-1.5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 w-full items-center gap-1 lg:min-w-[220px] lg:max-w-[min(100%,440px)] lg:flex-[1.15]">
                <SearchField
                  aria-label="폴더 경로 검색"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="min-w-0 flex-1"
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder="경로·제목·지역·동행·메모 검색 — 예: 서울, 2024"
                      className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                    />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button
                      type="button"
                      variant="ghost"
                      isIconOnly
                      size="sm"
                      className="h-9 w-9 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]"
                      aria-label="검색 범위 안내"
                    >
                      <span className="text-[13px] font-semibold">?</span>
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content className="max-w-xs text-xs">
                    경로·제목·지역·동행·메모 등으로 검색합니다.
                  </Tooltip.Content>
                </Tooltip>
              </div>

              <ScrollShadow
                orientation="horizontal"
                size={28}
                className="min-h-[36px] min-w-0 w-full lg:flex-1"
                hideScrollBar={false}
              >
                <div className="flex w-max min-w-0 flex-nowrap items-center gap-1.5 py-0.5">
                  <Text
                    size="xs"
                    className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]"
                  >
                    연도
                  </Text>
                  <Button
                    variant={selectedYear === 'all' ? 'primary' : 'secondary'}
                    className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                      selectedYear === 'all'
                        ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                        : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
                    }`}
                    onPress={() => setSelectedYear('all')}
                  >
                    전체
                  </Button>
                  {yearOptions.map((year) => (
                    <Button
                      key={year}
                      variant={selectedYear === year ? 'primary' : 'secondary'}
                      className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                        selectedYear === year
                          ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                          : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
                      }`}
                      onPress={() => setSelectedYear(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </ScrollShadow>

              <Badge
                size="sm"
                variant="soft"
                className="shrink-0 tabular-nums lg:ml-auto"
              >
                {visibleRows.length.toLocaleString()} /{' '}
                {filteredRows.length.toLocaleString()}
              </Badge>
            </Toolbar>

            {filteredRows.length === 0 ? (
              <Card.Content className="flex flex-1 items-center justify-center px-4 py-10">
                <Text className="text-sm text-[var(--app-muted)]">
                  {searchQuery.trim()
                    ? '검색어와 일치하는 폴더 경로가 없습니다.'
                    : '표시할 폴더 경로가 없습니다.'}
                </Text>
              </Card.Content>
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
          </>
        )}
      </Card>
    </div>
  )
}
