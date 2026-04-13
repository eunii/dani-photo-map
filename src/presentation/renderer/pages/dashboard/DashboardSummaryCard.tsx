import { Badge, Card } from '@heroui/react'

import type { LibraryIndexView } from '@shared/types/preload'

import { formatGeneratedAtLabel } from './dashboardFormatters'
import { DashboardKpiStat } from './DashboardKpiStat'
import { YearPhotoVolumeChart } from './YearPhotoVolumeChart'

interface DashboardSummaryCardProps {
  summary: {
    totalGroupCount: number
    totalPhotoCount: number
    unknownGroupCount: number
  }
  yearPhotoStats: { year: string; count: number }[]
  libraryIndex: LibraryIndexView | null
  loadSourceBadge: {
    label: string
    tone: string
    description: string
  } | null
}

export function DashboardSummaryCard({
  summary,
  yearPhotoStats,
  libraryIndex,
  loadSourceBadge
}: DashboardSummaryCardProps) {
  return (
    <Card className="app-surface-card relative overflow-hidden border border-[color:color-mix(in_srgb,var(--app-border)_65%,transparent)] shadow-none">
      <div
        className="app-grid-dots pointer-events-none absolute inset-0 opacity-[0.4]"
        aria-hidden
      />
      <Card.Content className="relative z-[1] space-y-1.5 p-1.5">
        <div className="grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
          <DashboardKpiStat
            label="전체 사진"
            value={summary.totalPhotoCount.toLocaleString()}
          />
          <DashboardKpiStat
            label="전체 그룹"
            value={summary.totalGroupCount.toLocaleString()}
          />
          <DashboardKpiStat
            label="위치 미확인"
            value={summary.unknownGroupCount.toLocaleString()}
          />
          <DashboardKpiStat
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
  )
}
