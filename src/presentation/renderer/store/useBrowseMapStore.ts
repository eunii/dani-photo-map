import { create } from 'zustand'

import type {
  BottomSheetState,
  DateQuickFilter,
  DateRangeFilter,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'

const STORAGE_KEY = 'photo-organizer/browse-map-ui'

interface StoredBrowseMapState {
  searchQuery: string
  quickFilter: DateQuickFilter
  dateRange: DateRangeFilter
  bottomSheetState: BottomSheetState
}

function readStoredState(): StoredBrowseMapState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return {
        searchQuery: '',
        quickFilter: 'all',
        dateRange: {},
        bottomSheetState: 'collapsed'
      }
    }

    const parsed = JSON.parse(raw) as Partial<StoredBrowseMapState>

    return {
      searchQuery: parsed.searchQuery ?? '',
      quickFilter: parsed.quickFilter ?? 'all',
      dateRange: parsed.dateRange ?? {},
      bottomSheetState: parsed.bottomSheetState ?? 'collapsed'
    }
  } catch {
    return {
      searchQuery: '',
      quickFilter: 'all',
      dateRange: {},
      bottomSheetState: 'collapsed'
    }
  }
}

function persistState(next: StoredBrowseMapState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    void next
  }
}

interface BrowseMapState extends StoredBrowseMapState {
  mapBounds: MapViewportBounds | null
  zoomLevel: number
  selectedGroupId?: string
  setSearchQuery: (value: string) => void
  setQuickFilter: (value: DateQuickFilter) => void
  setDateRange: (value: DateRangeFilter) => void
  setBottomSheetState: (value: BottomSheetState) => void
  setMapBounds: (value: MapViewportBounds | null) => void
  setZoomLevel: (value: number) => void
  setSelectedGroupId: (value?: string) => void
  resetFilters: () => void
}

const storedState = readStoredState()

export const useBrowseMapStore = create<BrowseMapState>((set) => ({
  ...storedState,
  mapBounds: null,
  zoomLevel: 2,
  selectedGroupId: undefined,
  setSearchQuery: (value) =>
    set((current) => {
      const next = { ...current, searchQuery: value }

      persistState({
        searchQuery: next.searchQuery,
        quickFilter: next.quickFilter,
        dateRange: next.dateRange,
        bottomSheetState: next.bottomSheetState
      })

      return {
        searchQuery: value
      }
    }),
  setQuickFilter: (value) =>
    set((current) => {
      const next = { ...current, quickFilter: value }

      persistState({
        searchQuery: next.searchQuery,
        quickFilter: next.quickFilter,
        dateRange: next.dateRange,
        bottomSheetState: next.bottomSheetState
      })

      return {
        quickFilter: value
      }
    }),
  setDateRange: (value) =>
    set((current) => {
      const next = { ...current, dateRange: value }

      persistState({
        searchQuery: next.searchQuery,
        quickFilter: next.quickFilter,
        dateRange: next.dateRange,
        bottomSheetState: next.bottomSheetState
      })

      return {
        dateRange: value
      }
    }),
  setBottomSheetState: (value) =>
    set((current) => {
      const next = { ...current, bottomSheetState: value }

      persistState({
        searchQuery: next.searchQuery,
        quickFilter: next.quickFilter,
        dateRange: next.dateRange,
        bottomSheetState: next.bottomSheetState
      })

      return {
        bottomSheetState: value
      }
    }),
  setMapBounds: (value) =>
    set({
      mapBounds: value
    }),
  setZoomLevel: (value) =>
    set({
      zoomLevel: value
    }),
  setSelectedGroupId: (value) =>
    set({
      selectedGroupId: value
    }),
  resetFilters: () =>
    set((current) => {
      const next = {
        searchQuery: '',
        quickFilter: 'all' as const,
        dateRange: {}
      }

      persistState({
        searchQuery: next.searchQuery,
        quickFilter: next.quickFilter,
        dateRange: next.dateRange,
        bottomSheetState: current.bottomSheetState
      })

      return next
    })
}))
