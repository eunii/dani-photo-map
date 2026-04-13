import { Text } from '@heroui/react'

interface DashboardKpiStatProps {
  label: string
  value: string
  valueClassName?: string
}

/** 집계 숫자 + 라벨 (컴팩트) */
export function DashboardKpiStat({
  label,
  value,
  valueClassName
}: DashboardKpiStatProps) {
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
