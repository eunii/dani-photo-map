import { Button, Drawer } from '@heroui/react'

import { SettingsPanelSections } from '@presentation/renderer/components/settings/SettingsPanelSections'

interface SettingsDrawerProps {
  isOpen: boolean
  onOpenChange: (next: boolean) => void
}

export function SettingsDrawer({
  isOpen,
  onOpenChange
}: SettingsDrawerProps) {
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
            aria-label="설정 패널"
            className="h-[calc(100vh-0.5rem)] w-[min(100%,480px)] rounded-[22px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-foreground)] shadow-[0_10px_28px_rgba(15,23,42,0.10)]"
          >
            <Drawer.Header className="items-start border-b border-[var(--app-border)] px-4 py-3">
              <div className="space-y-1">
                <Drawer.Heading className="text-lg font-semibold text-[var(--app-foreground)]">
                  설정
                </Drawer.Heading>
                <p className="text-sm text-[var(--app-muted)]">
                  출력 폴더와 감성 컬러 세트를 조정합니다.
                </p>
              </div>
              <Drawer.CloseTrigger className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]" />
            </Drawer.Header>

            <Drawer.Body className="px-4 py-3">
              <SettingsPanelSections compact />
            </Drawer.Body>

            <Drawer.Footer className="border-t border-[var(--app-border)] px-4 py-3">
              <div className="flex w-full items-center justify-between gap-3">
                <p className="text-xs text-[var(--app-muted)]">
                  선택한 테마와 사이드바 상태는 다음 실행에도 유지됩니다.
                </p>
                <Button
                  variant="secondary"
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[var(--app-foreground)]"
                  onPress={() => onOpenChange(false)}
                >
                  닫기
                </Button>
              </div>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
