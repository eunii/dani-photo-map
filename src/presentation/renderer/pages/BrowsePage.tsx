import { BrowsePageBanners } from './browse/BrowsePageBanners'
import { BrowsePageEmptyOutput } from './browse/BrowsePageEmptyOutput'
import { BrowsePageMapSplitLayout } from './browse/BrowsePageMapSplitLayout'
import { BrowsePageSearchFiltersSection } from './browse/BrowsePageSearchFiltersSection'
import type { BrowsePageProps } from './browse/browsePageProps'
import { useBrowsePage } from './browse/useBrowsePage'

export type { BrowsePageProps }

export function BrowsePage({ onNavigateToSettings }: BrowsePageProps) {
  const browse = useBrowsePage()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain app-scroll pr-0.5">
      <BrowsePageBanners
        errorMessage={browse.errorMessage}
        groupDetailErrorMessage={browse.groupDetailErrorMessage}
        successMessage={browse.successMessage}
      />

      {!browse.outputRoot ? (
        <BrowsePageEmptyOutput onNavigateToSettings={onNavigateToSettings} />
      ) : (
        <section className="flex min-h-0 flex-1 flex-col space-y-3">
          <BrowsePageSearchFiltersSection
            searchQuery={browse.searchQuery}
            filteredRecords={browse.filteredRecords}
            quickFilter={browse.quickFilter}
            dateRange={browse.dateRange}
            mappedRecordsLength={browse.mappedRecords.length}
            unmappedRecordsLength={browse.unmappedRecords.length}
            markerGroupsLength={browse.markerGroups.length}
            onSearchChange={browse.setSearchQuery}
            onSearchClear={() => browse.setSearchQuery('')}
            onQuickFilterChange={browse.handleQuickFilterChange}
            onDateRangeChange={browse.handleCustomDateRangeChange}
            onResetFilters={browse.resetFilters}
          />

          <BrowsePageMapSplitLayout
            splitLayoutRef={browse.splitLayoutRef}
            sidebarWidth={browse.sidebarWidth}
            outputRoot={browse.outputRoot}
            libraryIndex={browse.libraryIndex}
            loadSource={browse.loadSource}
            mapCanvasGroups={browse.mapCanvasGroups}
            markerGroups={browse.markerGroups}
            selectedPhotoPins={browse.selectedPhotoPins}
            focusedPhotoPin={browse.focusedPhotoPin}
            selectedGroupId={browse.selectedGroupId}
            previewPhotoId={browse.previewPhotoId}
            selectedGroupDetail={browse.selectedGroupDetail}
            zoomLevel={browse.zoomLevel}
            mapZoomPolicyUnclusteredMinZoom={browse.mapZoomPolicy.unclusteredMinZoom}
            filteredRecords={browse.filteredRecords}
            unmappedRecords={browse.unmappedRecords}
            selectedGroup={browse.selectedGroup}
            isLoadingGroupDetail={browse.isLoadingGroupDetail}
            groupDetailErrorMessage={browse.groupDetailErrorMessage}
            panelTab={browse.panelTab}
            setPanelTab={browse.setPanelTab}
            setPreviewPhotoId={browse.setPreviewPhotoId}
            isSavingGroup={browse.isSavingGroup}
            isMovingGroupPhotos={browse.isMovingGroupPhotos}
            onSelectGroup={browse.handleSelectGroup}
            onViewportChange={browse.handleViewportChange}
            onSaveGroup={browse.handleSaveGroup}
            onMoveGroupPhotos={browse.handleMoveGroupPhotos}
            onStartSidebarResize={browse.handleStartSidebarResize}
          />
        </section>
      )}

      {browse.isLoadingIndex ? (
        <p className="text-sm text-slate-500">출력 결과를 불러오는 중입니다...</p>
      ) : null}
    </div>
  )
}
