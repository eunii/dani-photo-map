import { Drawer } from '@heroui/react'

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
            <Drawer.Header className="flex-col items-start border-b border-[var(--app-border)] px-2 py-1.5">
              <div className="space-y-0.5">
                <Drawer.Heading className="text-base font-semibold text-[var(--app-foreground)]">
                  설정
                </Drawer.Heading>
                <p className="text-[11px] leading-snug text-[var(--app-muted)]">
                  출력 폴더와 화면 테마를 변경합니다.
                </p>
              </div>
            </Drawer.Header>

            <Drawer.Body className="px-2 py-1.5">
              <SettingsPanelSections />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
