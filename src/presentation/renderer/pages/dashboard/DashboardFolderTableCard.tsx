import type { RefObject } from 'react'

import { Card, Spinner, Table, Text } from '@heroui/react'

import {
  ChevronRightIcon,
  MapIcon
} from '@presentation/renderer/components/app/AppIcons'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { LibraryIndexView } from '@shared/types/preload'
import type { DashboardFolderRow } from '@presentation/renderer/view-models/dashboardFolderRows'

import {
  formatCaptureRange,
  formatGpsSummary
} from './dashboardFormatters'
import type { DashboardFolderTableItem } from './dashboardTableTypes'
import { DashboardFolderToolbar } from './DashboardFolderToolbar'

interface DashboardFolderTableCardProps {
  libraryIndex: LibraryIndexView | null
  isLoadingIndex: boolean
  errorMessage: string | null
  outputRoot: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedYear: 'all' | string
  onSelectYear: (year: 'all' | string) => void
  yearOptions: string[]
  filteredRows: DashboardFolderRow[]
  visibleRows: DashboardFolderRow[]
  folderTableItems: DashboardFolderTableItem[]
  hasMoreRows: boolean
  scrollContainerRef: RefObject<HTMLDivElement | null>
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>
  onNavigateToFilesPath: (pathSegments: string[]) => void
}

function DashboardFolderTableRow({
  item,
  outputRoot
}: {
  item: DashboardFolderTableItem
  outputRoot: string
}) {
  const thumbnailUrl = toOutputFileUrl(
    outputRoot,
    item.representativeThumbnailRelativePath
  )

  return (
    <>
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
        {formatCaptureRange(item.earliestCapturedAtIso, item.latestCapturedAtIso)}
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
    </>
  )
}

export function DashboardFolderTableCard({
  libraryIndex,
  isLoadingIndex,
  errorMessage,
  outputRoot,
  searchQuery,
  onSearchQueryChange,
  selectedYear,
  onSelectYear,
  yearOptions,
  filteredRows,
  visibleRows,
  folderTableItems,
  hasMoreRows,
  scrollContainerRef,
  loadMoreSentinelRef,
  onNavigateToFilesPath
}: DashboardFolderTableCardProps) {
  return (
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
          <DashboardFolderToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            selectedYear={selectedYear}
            onSelectYear={onSelectYear}
            yearOptions={yearOptions}
            visibleCount={visibleRows.length}
            filteredCount={filteredRows.length}
          />

          {filteredRows.length === 0 ? (
            <Card.Content className="flex flex-1 items-center justify-center px-4 py-10">
              <Text className="text-sm text-[var(--app-muted)]">
                {searchQuery.trim()
                  ? '검색어와 일치하는 폴더 경로가 없습니다.'
                  : '표시할 폴더 경로가 없습니다.'}
              </Text>
            </Card.Content>
          ) : (
            <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
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
                      {(item) => (
                        <Table.Row
                          id={item.id}
                          className="group cursor-pointer border-b border-[color:color-mix(in_srgb,var(--app-border)_40%,transparent)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--app-surface-strong)_92%,transparent)]"
                        >
                          <DashboardFolderTableRow item={item} outputRoot={outputRoot} />
                        </Table.Row>
                      )}
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
  )
}
