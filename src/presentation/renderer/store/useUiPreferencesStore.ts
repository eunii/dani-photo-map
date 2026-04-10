import { create } from 'zustand'

import {
  DEFAULT_UI_THEME_ID,
  type UiThemeId
} from '@presentation/renderer/theme/themePresets'

const STORAGE_KEY = 'photo-organizer/ui-preferences'

interface StoredUiPreferences {
  themeId: UiThemeId
  sidebarCollapsed: boolean
}

interface UiPreferencesState extends StoredUiPreferences {
  setThemeId: (value: UiThemeId) => void
  setSidebarCollapsed: (value: boolean) => void
  toggleSidebarCollapsed: () => void
}

function isUiThemeId(value: unknown): value is UiThemeId {
  return (
    value === 'olive-mist' ||
    value === 'violet-night' ||
    value === 'stone-coast' ||
    value === 'rose-powder'
  )
}

function readStoredPreferences(): StoredUiPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return {
        themeId: DEFAULT_UI_THEME_ID,
        sidebarCollapsed: false
      }
    }

    const parsed = JSON.parse(raw) as Partial<StoredUiPreferences>

    return {
      themeId: isUiThemeId(parsed.themeId)
        ? parsed.themeId
        : DEFAULT_UI_THEME_ID,
      sidebarCollapsed: parsed.sidebarCollapsed ?? false
    }
  } catch {
    return {
      themeId: DEFAULT_UI_THEME_ID,
      sidebarCollapsed: false
    }
  }
}

function persistPreferences(next: StoredUiPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    void next
  }
}

const storedPreferences = readStoredPreferences()

export const useUiPreferencesStore = create<UiPreferencesState>((set) => ({
  ...storedPreferences,
  setThemeId: (value) =>
    set((current) => {
      const next = {
        themeId: value,
        sidebarCollapsed: current.sidebarCollapsed
      }

      persistPreferences(next)
      return { themeId: value }
    }),
  setSidebarCollapsed: (value) =>
    set((current) => {
      const next = {
        themeId: current.themeId,
        sidebarCollapsed: value
      }

      persistPreferences(next)
      return { sidebarCollapsed: value }
    }),
  toggleSidebarCollapsed: () =>
    set((current) => {
      const next = {
        themeId: current.themeId,
        sidebarCollapsed: !current.sidebarCollapsed
      }

      persistPreferences(next)
      return { sidebarCollapsed: next.sidebarCollapsed }
    })
}))
