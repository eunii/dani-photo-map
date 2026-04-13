import { DashboardFolderTableCard } from './dashboard/DashboardFolderTableCard'
import { DashboardPageEmptyOutput } from './dashboard/DashboardPageEmptyOutput'
import type { DashboardPageProps } from './dashboard/dashboardPageProps'
import { DashboardSummaryCard } from './dashboard/DashboardSummaryCard'
import { useDashboardPage } from './dashboard/useDashboardPage'

export type { DashboardPageProps }

export function DashboardPage({
  onNavigateToFilesPath,
  onNavigateToSettings
}: DashboardPageProps) {
  const dash = useDashboardPage()

  if (!dash.outputRoot) {
    return (
      <DashboardPageEmptyOutput onNavigateToSettings={onNavigateToSettings} />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <DashboardSummaryCard
        summary={dash.summary}
        yearPhotoStats={dash.yearPhotoStats}
        libraryIndex={dash.libraryIndex}
        loadSourceBadge={dash.loadSourceBadge}
      />

      <DashboardFolderTableCard
        libraryIndex={dash.libraryIndex}
        isLoadingIndex={dash.isLoadingIndex}
        errorMessage={dash.errorMessage}
        outputRoot={dash.outputRoot}
        searchQuery={dash.searchQuery}
        onSearchQueryChange={dash.setSearchQuery}
        selectedYear={dash.selectedYear}
        onSelectYear={dash.setSelectedYear}
        yearOptions={dash.yearOptions}
        filteredRows={dash.filteredRows}
        visibleRows={dash.visibleRows}
        folderTableItems={dash.folderTableItems}
        hasMoreRows={dash.hasMoreRows}
        scrollContainerRef={dash.scrollContainerRef}
        loadMoreSentinelRef={dash.loadMoreSentinelRef}
        onNavigateToFilesPath={onNavigateToFilesPath}
      />
    </div>
  )
}
