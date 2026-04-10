import { SettingsPanelSections } from '@presentation/renderer/components/settings/SettingsPanelSections'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--app-foreground)]">
          설정 페이지
        </h2>
        <p className="text-sm text-[var(--app-muted)]">
          드로어와 동일한 설정을 별도 페이지에서도 확인할 수 있습니다.
        </p>
      </div>
      <SettingsPanelSections />
    </div>
  )
}
