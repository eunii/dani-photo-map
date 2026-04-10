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

function ThemePaletteButton({ themeId }: { themeId: UiThemeId }) {
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
      className={`w-full rounded-lg border p-1.5 text-left transition ${
        isSelected
          ? 'border-[var(--app-accent)] bg-[var(--app-surface-strong)]'
          : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
      }`}
      onClick={() => setThemeId(themeId)}
    >
      <div>
        <p className="text-[13px] font-medium text-[var(--app-foreground)]">{preset.name}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--app-muted)]">
          {preset.description}
        </p>
      </div>
      <div className="mt-1 grid grid-cols-5 gap-0.5">
        {preset.colors.map((color) => (
          <span
            key={color}
            className="h-4 rounded-md border border-white/60"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  )
}

export function SettingsPanelSections() {
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
    <div className="space-y-1.5">
      <Card className="app-surface-card border-0 shadow-none">
        <div className="space-y-1.5 px-2 py-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--app-foreground)]">출력 폴더</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--app-muted)]">
              파일 목록과 지도는 같은 출력 루트를 사용합니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-[12px] text-[var(--app-muted)]">
            {outputRoot || '아직 선택되지 않았습니다.'}
          </div>

          <div className="flex flex-wrap gap-1">
            <Button
              variant="primary"
              className="h-7 rounded-lg bg-[var(--app-button)] px-2 text-[12px] text-[var(--app-button-foreground)]"
              onPress={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </Button>
            <Button
              variant="secondary"
              className="h-7 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[12px] text-[var(--app-foreground)]"
              isDisabled={!outputRoot || isLoadingIndex}
              onPress={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </Button>
            <Button
              variant="ghost"
              className="h-7 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[12px] text-[var(--app-foreground)]"
              isDisabled={!outputRoot || isLoadingIndex}
              onPress={() => void reloadFolderStructureOnly()}
            >
              폴더 구조만 다시 읽기
            </Button>
          </div>
        </div>
      </Card>

      <Card className="app-surface-card border-0 shadow-none">
        <div className="space-y-1.5 px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--app-surface-strong)] text-[var(--app-accent-strong)]">
              <SparklesIcon className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-base font-semibold text-[var(--app-foreground)]">테마 선택</h3>
          </div>

          <div className="grid gap-1 md:grid-cols-2">
            {UI_THEME_PRESETS.map((preset) => (
              <ThemePaletteButton key={preset.id} themeId={preset.id} />
            ))}
          </div>
        </div>
      </Card>

      {sourceBadge ? (
        <div className={`rounded-lg border px-2 py-1.5 text-[11px] ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-current/20 bg-white/70 px-1.5 py-0 text-[10px] font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
