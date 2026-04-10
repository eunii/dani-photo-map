import { Button, Card } from '@heroui/react'

import { SparklesIcon } from '@presentation/renderer/components/app/AppIcons'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useUiPreferencesStore } from '@presentation/renderer/store/useUiPreferencesStore'
import {
  UI_THEME_PRESETS,
  type UiThemeId
} from '@presentation/renderer/theme/themePresets'

interface SettingsPanelSectionsProps {
  compact?: boolean
}

function ThemePaletteButton({
  themeId,
  compact
}: {
  themeId: UiThemeId
  compact: boolean
}) {
  const currentThemeId = useUiPreferencesStore((state) => state.themeId)
  const setThemeId = useUiPreferencesStore((state) => state.setThemeId)
  const preset = UI_THEME_PRESETS.find((item) => item.id === themeId)

  if (!preset) {
    return null
  }

  const isSelected = currentThemeId === themeId

  return (
    <button
      type="button"
      className={`w-full rounded-[16px] border p-2.5 text-left transition ${
        isSelected
          ? 'border-[var(--app-accent)] bg-[var(--app-surface-strong)]'
          : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
      }`}
      onClick={() => setThemeId(themeId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--app-foreground)]">{preset.name}</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            {preset.description}
          </p>
        </div>
        {isSelected ? (
          <span className="rounded-full bg-[var(--app-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--app-accent-foreground)]">
            선택됨
          </span>
        ) : null}
      </div>
      <div className={`mt-2 grid gap-1.5 ${compact ? 'grid-cols-5' : 'grid-cols-5'}`}>
        {preset.colors.map((color) => (
          <span
            key={color}
            className="h-7 rounded-xl border border-white/60"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  )
}

export function SettingsPanelSections({
  compact = false
}: SettingsPanelSectionsProps) {
  const {
    outputRoot,
    isLoadingIndex,
    errorMessage,
    selectOutputRoot,
    reloadLibraryIndex,
    reloadFolderStructureOnly,
    loadSource
  } = useOutputLibraryIndexPanel()
  const sourceBadge = getLoadSourceBadge(loadSource)

  return (
    <div className="space-y-3">
      <Card className="app-surface-card border-0 shadow-none">
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-accent-strong)]">
              Output
            </p>
            <h3 className="text-lg font-semibold text-[var(--app-foreground)]">
              출력 폴더
            </h3>
            <p className="text-sm text-[var(--app-muted)]">
              파일 목록과 지도는 같은 출력 루트를 사용합니다.
            </p>
          </div>

          <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-muted)]">
            {outputRoot || '아직 선택되지 않았습니다.'}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              className="rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
              onPress={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[var(--app-foreground)]"
              isDisabled={!outputRoot || isLoadingIndex}
              onPress={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[var(--app-foreground)]"
              isDisabled={!outputRoot || isLoadingIndex}
              onPress={() => void reloadFolderStructureOnly()}
            >
              폴더 구조만 다시 읽기
            </Button>
          </div>
        </div>
      </Card>

      <Card className="app-surface-card border-0 shadow-none">
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-surface-strong)] text-[var(--app-accent-strong)]">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[var(--app-foreground)]">
                감성 컬러 세트
              </h3>
              <p className="text-sm text-[var(--app-muted)]">
                앱 셸과 설정 패널 중심으로 톤을 바꿉니다.
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {UI_THEME_PRESETS.map((preset) => (
              <ThemePaletteButton
                key={preset.id}
                themeId={preset.id}
                compact={compact}
              />
            ))}
          </div>
        </div>
      </Card>

      {sourceBadge ? (
        <div className={`rounded-[16px] border px-3 py-2 text-sm ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
