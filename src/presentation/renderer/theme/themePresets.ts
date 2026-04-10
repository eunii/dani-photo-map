export type UiThemeId =
  | 'olive-mist'
  | 'violet-night'
  | 'stone-coast'
  | 'rose-powder'

export interface UiThemePreset {
  id: UiThemeId
  name: string
  description: string
  colors: [string, string, string, string]
}

export const DEFAULT_UI_THEME_ID: UiThemeId = 'olive-mist'

export const UI_THEME_PRESETS: UiThemePreset[] = [
  {
    id: 'olive-mist',
    name: 'Olive Mist',
    description: '차분한 올리브와 크림 톤',
    colors: ['#A8BBA3', '#F7F4EA', '#EBD9D1', '#B87C4C']
  },
  {
    id: 'violet-night',
    name: 'Violet Night',
    description: '짙은 보라와 차가운 블루 톤',
    colors: ['#27005D', '#9400FF', '#AED2FF', '#E4F1FF']
  },
  {
    id: 'stone-coast',
    name: 'Stone Coast',
    description: '은은한 스톤과 바다빛 중성 톤',
    colors: ['#89A8B2', '#B3C8CF', '#E5E1DA', '#F1F0E8']
  },
  {
    id: 'rose-powder',
    name: 'Rose Powder',
    description: '부드러운 로즈 파우더 톤',
    colors: ['#F9F5F6', '#F8E8EE', '#FDCEDF', '#F2BED1']
  }
]

export function getUiThemePreset(themeId: UiThemeId): UiThemePreset {
  return (
    UI_THEME_PRESETS.find((preset) => preset.id === themeId) ??
    UI_THEME_PRESETS[0]!
  )
}
