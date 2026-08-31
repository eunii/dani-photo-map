import { useEffect, useState } from 'react'

import { Button, Drawer } from '@heroui/react'

import type { OrganizeJobStatus, SaveHistoryEntry } from '@shared/types/preload'
import { OrganizeFileOutcomeLogPanel } from '@presentation/renderer/components/organize/OrganizeFileOutcomeLogPanel'
import { SaveHistoryPanel } from '@presentation/renderer/components/organize/SaveHistoryPanel'
import { useOrganizeJobStore } from '@presentation/renderer/store/useOrganizeJobStore'

interface OrganizeJobLogDrawerProps {
  isOpen: boolean
  onOpenChange: (next: boolean) => void
  outputRoot: string | null
}

type DrawerTab = 'live' | 'history'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getPhaseHeading(status: OrganizeJobStatus): string {
  switch (status.phase) {
    case 'preview-running':
      return '정리 후보 불러오는 중'
    case 'save-running':
      return '사진 정리 저장 중'
    case 'completed':
      return '정리 저장 완료'
    case 'failed':
      return '정리 저장 실패'
    case 'cancelled':
      return '정리 저장이 취소됨'
    default:
      return '사진 정리 작업'
  }
}

export function OrganizeJobLogDrawer({
  isOpen,
  onOpenChange,
  outputRoot
}: OrganizeJobLogDrawerProps) {
  const status = useOrganizeJobStore((state) => state.status)
  const fileOutcomeLog = useOrganizeJobStore((state) => state.fileOutcomeLog)
  const [activeTab, setActiveTab] = useState<DrawerTab>('live')
  const [history, setHistory] = useState<SaveHistoryEntry[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const isRunning = status.phase === 'save-running'
  const total = status.progress.total > 0 ? status.progress.total : 1
  const overallPct = clampPercent((status.progress.completed / total) * 100)

  useEffect(() => {
    if (!isOpen || !outputRoot) {
      return
    }

    let cancelled = false
    setIsHistoryLoading(true)

    void window.photoApp
      .getSaveHistory({ outputRoot })
      .then((entries) => {
        if (!cancelled) {
          setHistory(entries)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
    // status.phase도 의존성에 넣어서, 드로어를 연 채로 저장이 끝나면 이력이 바로 갱신되게 한다.
  }, [isOpen, outputRoot, status.phase])

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        variant="blur"
        className="bg-slate-900/18 backdrop-blur-[2px]"
      >
        <Drawer.Content placement="right" className="p-1.5 sm:p-2">
          <Drawer.Dialog
            aria-label="사진 정리 진행 로그"
            className="flex h-[calc(100vh-0.5rem)] w-[min(100%,480px)] flex-col rounded-[22px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-foreground)] shadow-[0_10px_28px_rgba(15,23,42,0.10)]"
          >
            <Drawer.Header className="flex-col items-start gap-2 border-b border-[var(--app-border)] px-2 py-1.5">
              <div className="flex w-full items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <Drawer.Heading className="text-base font-semibold text-[var(--app-foreground)]">
                    {getPhaseHeading(status)}
                  </Drawer.Heading>
                  {status.message ? (
                    <p className="text-[11px] leading-snug text-[var(--app-muted)]">
                      {status.message}
                    </p>
                  ) : null}
                </div>
                {isRunning ? (
                  <Button
                    variant="secondary"
                    className="shrink-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[11px] font-semibold text-[var(--app-foreground)]"
                    onPress={() => void window.photoApp.cancelOrganizeJob()}
                  >
                    남은 작업 취소
                  </Button>
                ) : null}
              </div>

              {status.phase === 'save-running' || status.phase === 'completed' ? (
                <div className="w-full">
                  <div className="flex items-center justify-between text-[11px] text-[var(--app-muted)]">
                    <span>
                      전체 진행 {status.progress.completed} / {status.progress.total}장
                    </span>
                    <span>{overallPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--app-border)_42%,transparent)]">
                    <div
                      className="h-full rounded-full bg-[var(--app-accent-strong)] transition-[width] duration-300"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </Drawer.Header>

            <div className="flex shrink-0 gap-1 border-b border-[var(--app-border)] px-2 pt-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`rounded-t-[10px] px-3 py-1.5 text-xs font-medium ${
                  activeTab === 'live'
                    ? 'border-b-2 border-[var(--app-accent-strong)] text-[var(--app-accent-strong)]'
                    : 'text-[var(--app-muted)]'
                }`}
              >
                실시간 로그
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`rounded-t-[10px] px-3 py-1.5 text-xs font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-[var(--app-accent-strong)] text-[var(--app-accent-strong)]'
                    : 'text-[var(--app-muted)]'
                }`}
              >
                저장 이력
              </button>
            </div>

            <Drawer.Body className="flex min-h-0 flex-1 flex-col px-2 py-1.5">
              {activeTab === 'live' ? (
                <OrganizeFileOutcomeLogPanel entries={fileOutcomeLog} />
              ) : (
                <SaveHistoryPanel entries={history} isLoading={isHistoryLoading} />
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
