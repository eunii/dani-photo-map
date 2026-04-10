import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  SearchField,
  Spinner,
  Table,
  Text,
  Tooltip
} from '@heroui/react'

import {
  ChevronRightIcon,
  MapIcon,
} from '@presentation/renderer/components/app/AppIcons'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupSummary } from '@shared/types/preload'
import type { DashboardFolderRow } from '@presentation/renderer/view-models/dashboardFolderRows'
import {
  buildDashboardFolderRows,
  filterDashboardFolderRows
} from '@presentation/renderer/view-models/dashboardFolderRows'

const PAGE_SIZE = 48

type FolderTableItem = DashboardFolderRow & { id: string }

function folderRowId(row: DashboardFolderRow): string {
  return row.pathSegments.join('\x1e')
}

function parseCaptureTimeMs(iso?: string): number | null {
  if (!iso) {
    return null
  }

  const ms = Date.parse(iso)

  return Number.isNaN(ms) ? null : ms
}

/** 촬영 최신일 기준 내림차순(최신 폴더가 위). 날짜 없으면 아래쪽, 동률은 경로 키 */
function compareDashboardRowsLatestFirst(
  a: DashboardFolderRow,
  b: DashboardFolderRow
): number {
  const ta =
    parseCaptureTimeMs(a.latestCapturedAtIso) ??
    parseCaptureTimeMs(a.earliestCapturedAtIso)
  const tb =
    parseCaptureTimeMs(b.latestCapturedAtIso) ??
    parseCaptureTimeMs(b.earliestCapturedAtIso)

  if (ta !== null && tb !== null && ta !== tb) {
    return tb - ta
  }

  if (ta !== null && tb === null) {
    return -1
  }

  if (ta === null && tb !== null) {
    return 1
  }

  return folderRowId(a).localeCompare(folderRowId(b), undefined, {
    numeric: true,
    sensitivity: 'base'
  })
}

function yearKeyForGroup(group: GroupSummary): string | null {
  const iso = group.earliestCapturedAtIso ?? group.latestCapturedAtIso

  if (iso && iso.length >= 4) {
    const y = Number.parseInt(iso.slice(0, 4), 10)

    if (y >= 1900 && y <= 2100) {
      return String(y)
    }
  }

  const seg = group.pathSegments[0]

  if (seg && /^\d{4}$/.test(seg)) {
    return seg
  }

  return null
}

/** 연도별 사진 장수 — 가로 막대 + 연도 축 */
function YearPhotoVolumeChart({
  stats
}: {
  stats: { year: string; count: number }[]
}) {
  const max = Math.max(...stats.map((entry) => entry.count), 1)

  if (stats.length === 0) {
    return (
      <div className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--app-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--app-surface-strong)_88%,transparent)] px-2 text-[11px] text-[var(--app-muted)]">
        표시할 연도 분포가 없습니다
      </div>
    )
  }

  return (
    <div
      className="w-full min-w-0 rounded-xl border border-[color:color-mix(in_srgb,var(--app-border)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--app-surface-strong)_92%,transparent)] p-2"
      role="img"
      aria-label="연도별 사진 장수 막대 그래프"
    >
      <div className="flex h-14 w-full min-w-0 gap-px">
        {stats.map(({ year, count }) => {
          const heightPercent = Math.max(
            (count / max) * 100,
            count > 0 ? 14 : 0
          )

          return (
            <div
              key={year}
              className="flex h-14 min-w-0 flex-1 flex-col justify-end"
            >
              <Tooltip>
                <Tooltip.Trigger>
                  <button
                    type="button"
                    className="flex h-full w-full flex-col justify-end border-0 bg-transparent p-0 outline-none"
                  >
                    <span
                      className="block w-full min-h-[3px] rounded-[2px] bg-[color:color-mix(in_srgb,var(--app-accent)_88%,transparent)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content className="text-xs">
                  {year}년 · {count.toLocaleString()}장
                </Tooltip.Content>
              </Tooltip>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex w-full min-w-0 gap-px border-t border-[color:color-mix(in_srgb,var(--app-border)_45%,transparent)] pt-1">
        {stats.map(({ year }) => (
          <div
            key={`${year}-label`}
            className="min-w-0 flex-1 truncate text-center text-[9px] tabular-nums leading-none text-[var(--app-muted)]"
          >
            {year}
          </div>
        ))}
      </div>
    </div>
  )
}

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
  onNavigateToFilesPath: (pathSegments: string[]) => void
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

/** 집계 숫자 + 라벨 (컴팩트) */
function KpiStat({
  label,
  value,
  valueClassName
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="min-w-0">
      <p
        className={`font-semibold tabular-nums tracking-tight text-[var(--app-foreground)] ${
          valueClassName ?? 'text-[15px] leading-none sm:text-[16px]'
        }`}
      >
        {value}
      </p>
      <Text size="xs" className="mt-0.5 text-[10px] leading-tight text-[var(--app-muted)]">
        {label}
      </Text>
    </div>
  )
}

export function DashboardPage({
  onNavigateToFilesPath,
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
  const sortedFilteredRows = useMemo(() => {
    const next = [...filteredRows]

    next.sort(compareDashboardRowsLatestFirst)

    return next
  }, [filteredRows])
  const visibleRows = useMemo(
    () => sortedFilteredRows.slice(0, visibleCount),
    [sortedFilteredRows, visibleCount]
  )
  const hasMoreRows = visibleCount < sortedFilteredRows.length

  const summary = useMemo(() => {
    const totalPhotoCount = groups.reduce((sum, group) => sum + group.photoCount, 0)
    const unknownGroupCount = groups.filter((group) => group.isUnknownLocation).length

    return {
      totalGroupCount: groups.length,
      totalPhotoCount,
      unknownGroupCount
    }
  }, [groups])

  const yearPhotoStats = useMemo(() => {
    const byYear = new Map<string, number>()

    for (const group of groups) {
      const year = yearKeyForGroup(group)

      if (!year) {
        continue
      }

      byYear.set(year, (byYear.get(year) ?? 0) + group.photoCount)
    }

    return [...byYear.entries()]
      .sort((left, right) =>
        left[0].localeCompare(right[0], undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      )
      .map(([year, count]) => ({ year, count }))
  }, [groups])

  const folderTableItems = useMemo(
    (): FolderTableItem[] =>
      visibleRows.map((row) => ({
        ...row,
        id: folderRowId(row)
      })),
    [visibleRows]
  )

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
            Math.min(current + PAGE_SIZE, sortedFilteredRows.length)
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
  }, [sortedFilteredRows.length, hasMoreRows])

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
      <Card className="app-surface-card relative overflow-hidden border border-[color:color-mix(in_srgb,var(--app-border)_65%,transparent)] shadow-none">
        <div
          className="app-grid-dots pointer-events-none absolute inset-0 opacity-[0.4]"
          aria-hidden
        />
        <Card.Content className="relative z-[1] space-y-1.5 p-1.5">
          <div className="grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            <KpiStat
              label="전체 사진"
              value={summary.totalPhotoCount.toLocaleString()}
            />
            <KpiStat
              label="전체 그룹"
              value={summary.totalGroupCount.toLocaleString()}
            />
            <KpiStat
              label="위치 미확인"
              value={summary.unknownGroupCount.toLocaleString()}
            />
            <KpiStat
              label="마지막 갱신"
              value={formatGeneratedAtLabel(libraryIndex?.generatedAt)}
              valueClassName="text-[11px] leading-snug sm:text-[12px]"
            />
          </div>

          <div className="w-full min-w-0">
            <YearPhotoVolumeChart stats={yearPhotoStats} />
          </div>

          {loadSourceBadge ? (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <Badge
                size="sm"
                variant="soft"
                className={`rounded-full border px-1.5 py-0 text-[10px] font-normal leading-tight ${loadSourceBadge.tone}`}
                title={loadSourceBadge.description}
              >
                {loadSourceBadge.label}
              </Badge>
            </div>
          ) : null}
        </Card.Content>
      </Card>

      <Card className="app-surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--app-border)_65%,transparent)] shadow-none">
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
            <div className="w-full min-w-0 border-b border-[var(--app-border)] px-1.5 py-1 sm:px-2">
              <div className="grid w-full min-w-0 grid-cols-2 gap-1 sm:gap-1.5">
                <div className="flex min-h-7 min-w-0 max-w-full items-center gap-0.5 sm:min-w-0">
                  <SearchField
                    aria-label="폴더 경로 검색"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="min-w-0 w-full flex-1 basis-0"
                  >
                    <SearchField.Group className="border-0 bg-transparent shadow-none ring-0 ring-offset-0 outline-none">
                      <SearchField.SearchIcon />
                      <SearchField.Input
                        placeholder="검색 — 경로·제목·지역 등"
                        className="h-7 w-full min-w-0 border-0 bg-transparent text-[13px] shadow-none ring-0 ring-offset-0 outline-none focus-visible:ring-0"
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
                        className="h-7 w-7 shrink-0 rounded-md border-0 bg-transparent text-[var(--app-muted)]"
                        aria-label="검색 범위 안내"
                      >
                        <span className="text-[12px] font-semibold">?</span>
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="max-w-xs text-xs">
                      경로·제목·지역·동행·메모 등으로 검색합니다.
                    </Tooltip.Content>
                  </Tooltip>
                  <Badge
                    size="sm"
                    variant="soft"
                    className="hidden max-w-[5rem] shrink-0 truncate tabular-nums sm:inline-flex"
                  >
                    {visibleRows.length.toLocaleString()} /{' '}
                    {filteredRows.length.toLocaleString()}
                  </Badge>
                </div>

                <ScrollShadow
                  orientation="horizontal"
                  size={20}
                  className="min-h-7 min-w-0 w-full"
                  hideScrollBar={false}
                >
                  <div className="flex h-7 w-max max-w-full min-w-0 flex-nowrap items-center gap-1 pr-0.5">
                    <Button
                      variant={selectedYear === 'all' ? 'primary' : 'secondary'}
                      className={`h-7 shrink-0 rounded-full px-2 text-[12px] font-medium ${
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
                        className={`h-7 shrink-0 rounded-full px-2 text-[12px] font-medium ${
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

                <div className="col-span-2 flex justify-end sm:hidden">
                  <Badge size="sm" variant="soft" className="tabular-nums">
                    {visibleRows.length.toLocaleString()} /{' '}
                    {filteredRows.length.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>

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
            <div className="min-w-0 px-1.5 pb-1.5 pt-0.5">
              <Table.Root className="w-full min-w-0">
                <Table.Content
                  selectionMode="none"
                  className="min-w-[1040px] w-full border-separate border-spacing-0"
                  onRowAction={(key) => {
                    const id = String(key)
                    const item = folderTableItems.find((row) => row.id === id)

                    if (item) {
                      onNavigateToFilesPath(item.pathSegments)
                    }
                  }}
                >
                  <Table.Header className="sticky top-0 z-[1] bg-[var(--app-surface-strong)] [&_th]:border-b [&_th]:border-[var(--app-border)]">
                    <Table.Column className="w-[48px] max-w-[48px] px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      대표
                    </Table.Column>
                    <Table.Column
                      isRowHeader
                      className="min-w-[200px] px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]"
                    >
                      경로 · 제목
                    </Table.Column>
                    <Table.Column className="min-w-[72px] px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      지역
                    </Table.Column>
                    <Table.Column className="min-w-[100px] px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      촬영
                    </Table.Column>
                    <Table.Column className="min-w-[88px] px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      위치
                    </Table.Column>
                    <Table.Column className="w-10 px-0 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      지도
                    </Table.Column>
                    <Table.Column className="min-w-[84px] px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      동행
                    </Table.Column>
                    <Table.Column className="w-9 px-0 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      메모
                    </Table.Column>
                    <Table.Column className="min-w-[44px] px-1 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      장수
                    </Table.Column>
                    <Table.Column className="w-7 px-0 py-1.5">
                      <span className="sr-only">이동</span>
                    </Table.Column>
                  </Table.Header>
                  <Table.Body items={folderTableItems}>
                    {(item) => {
                      const thumbnailUrl = toOutputFileUrl(
                        outputRoot,
                        item.representativeThumbnailRelativePath
                      )

                      return (
                        <Table.Row
                          id={item.id}
                          className="group cursor-pointer border-b border-[color:color-mix(in_srgb,var(--app-border)_40%,transparent)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--app-surface-strong)_92%,transparent)]"
                        >
                          <Table.Cell className="px-1 py-1 align-middle">
                            <div className="flex justify-center">
                              <div className="h-9 w-9 overflow-hidden rounded-[10px] bg-[var(--app-surface-strong)] ring-1 ring-[color:color-mix(in_srgb,var(--app-border)_50%,transparent)] transition group-hover:ring-[var(--app-accent)]">
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt=""
                                    className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--app-muted)]">
                                    없음
                                  </div>
                                )}
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="max-w-[1px] px-1.5 py-1 align-middle">
                            <p className="truncate text-[13px] font-medium text-[var(--app-foreground)]">
                              {item.fullPathLabel}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-[var(--app-muted)]">
                              {item.displayTitle || '—'}
                            </p>
                          </Table.Cell>
                          <Table.Cell className="min-w-0 truncate px-1 py-1 align-middle text-[12px] text-[var(--app-foreground)]">
                            {item.regionLabel || '—'}
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap px-1 py-1 align-middle text-[12px] tabular-nums text-[var(--app-foreground)]">
                            {formatCaptureRange(
                              item.earliestCapturedAtIso,
                              item.latestCapturedAtIso
                            )}
                          </Table.Cell>
                          <Table.Cell className="min-w-0 px-1 py-1 align-middle">
                            <span
                              className={`inline-flex max-w-full truncate rounded px-1 py-0.5 text-[12px] font-medium tabular-nums ${
                                item.isUnknownLocation
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                                  : 'bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
                              }`}
                              title={formatGpsSummary(item)}
                            >
                              {formatGpsSummary(item)}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="px-0 py-1 text-center align-middle text-[var(--app-muted)]">
                            {item.hasMapPin ? (
                              <MapIcon
                                className="mx-auto h-4 w-4 text-[var(--app-accent-strong)]"
                                title="지도에 표시 가능"
                              />
                            ) : (
                              <span className="text-[12px]">—</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="min-w-0 truncate px-1 py-1 align-middle text-[12px] text-[var(--app-foreground)]">
                            {item.companionsShort}
                          </Table.Cell>
                          <Table.Cell className="px-0 py-1 text-center align-middle">
                            {item.hasNotes ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-surface-strong)] text-[13px] leading-none text-[var(--app-accent-strong)]"
                                title="메모 있음"
                              >
                                ···
                              </span>
                            ) : (
                              <span className="text-[12px] text-[var(--app-muted)]">—</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="px-1 py-1 text-right align-middle tabular-nums">
                            <span className="text-[13px] font-semibold text-[var(--app-foreground)]">
                              {item.photoCount.toLocaleString()}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="px-0 py-1 text-center align-middle text-[var(--app-muted)] transition group-hover:text-[var(--app-accent-strong)]">
                            <ChevronRightIcon className="mx-auto h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                          </Table.Cell>
                        </Table.Row>
                      )
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.Root>

              {hasMoreRows ? (
                <div
                  ref={loadMoreSentinelRef}
                  className="px-2 py-2 text-center text-[11px] text-[var(--app-muted)]"
                >
                  더 많은 폴더를 불러오는 중입니다.
                </div>
              ) : null}
            </div>
          </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
