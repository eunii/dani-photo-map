import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import {
  buildDashboardFolderRows,
  filterDashboardFolderRows
} from '@presentation/renderer/view-models/dashboardFolderRows'

import { PAGE_SIZE } from './dashboardConstants'
import {
  compareDashboardRowsLatestFirst,
  folderRowId,
  yearKeyForGroup
} from './dashboardFormatters'
import type { DashboardFolderTableItem } from './dashboardTableTypes'

export function useDashboardPage() {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage
  } = useOutputLibraryIndexPanel()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<'all' | string>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const groups = libraryIndex?.groups ?? []
  const loadSourceBadge = getLoadSourceBadge(loadSource)

  const allRows = useMemo(() => buildDashboardFolderRows(groups), [groups])
  const yearOptions = useMemo(() => {
    const years = [...new Set(allRows.map((row) => row.yearSegment))]

    return years.sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [allRows])
  const searchFilteredRows = useMemo(
    () => filterDashboardFolderRows(allRows, searchQuery),
    [allRows, searchQuery]
  )
  const filteredRows = useMemo(() => {
    if (selectedYear === 'all') {
      return searchFilteredRows
    }

    return searchFilteredRows.filter((row) => row.yearSegment === selectedYear)
  }, [searchFilteredRows, selectedYear])
  const sortedFilteredRows = useMemo(() => {
    const next = [...filteredRows]

    next.sort(compareDashboardRowsLatestFirst)

    return next
  }, [filteredRows])
  const visibleRows = useMemo(
    () => sortedFilteredRows.slice(0, visibleCount),
    [sortedFilteredRows, visibleCount]
  )
  const hasMoreRows = visibleCount < sortedFilteredRows.length

  const summary = useMemo(() => {
    const totalPhotoCount = groups.reduce((sum, group) => sum + group.photoCount, 0)
    const unknownGroupCount = groups.filter((group) => group.isUnknownLocation).length

    return {
      totalGroupCount: groups.length,
      totalPhotoCount,
      unknownGroupCount
    }
  }, [groups])

  const yearPhotoStats = useMemo(() => {
    const byYear = new Map<string, number>()

    for (const group of groups) {
      const year = yearKeyForGroup(group)

      if (!year) {
        continue
      }

      byYear.set(year, (byYear.get(year) ?? 0) + group.photoCount)
    }

    return [...byYear.entries()]
      .sort((left, right) =>
        left[0].localeCompare(right[0], undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      )
      .map(([year, count]) => ({ year, count }))
  }, [groups])

  const folderTableItems = useMemo(
    (): DashboardFolderTableItem[] =>
      visibleRows.map((row) => ({
        ...row,
        id: folderRowId(row)
      })),
    [visibleRows]
  )

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, selectedYear, groups.length])

  useEffect(() => {
    const node = loadMoreSentinelRef.current

    if (!node || !hasMoreRows) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]

        if (firstEntry?.isIntersecting) {
          setVisibleCount((current) =>
            Math.min(current + PAGE_SIZE, sortedFilteredRows.length)
          )
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '180px',
        threshold: 0
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [sortedFilteredRows.length, hasMoreRows])

  return {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    loadSourceBadge,
    searchQuery,
    setSearchQuery,
    selectedYear,
    setSelectedYear,
    yearOptions,
    filteredRows,
    visibleRows,
    sortedFilteredRowsLength: sortedFilteredRows.length,
    folderTableItems,
    summary,
    yearPhotoStats,
    hasMoreRows,
    scrollContainerRef,
    loadMoreSentinelRef
  }
}
