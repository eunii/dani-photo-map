import { Tooltip } from '@heroui/react'

interface YearPhotoVolumeChartProps {
  stats: { year: string; count: number }[]
}

/** 연도별 사진 장수 — 가로 막대 + 연도 축 */
export function YearPhotoVolumeChart({ stats }: YearPhotoVolumeChartProps) {
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
