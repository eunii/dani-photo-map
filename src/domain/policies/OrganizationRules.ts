export interface OrganizationRules {
  duplicateStrategy: 'exact-binary'
  fileOperation: 'copy'
  unknownRegionLabel: string
  captureRegionLabel: string
  outputIndexRelativePath: '.photo-organizer/index.json'
  outputThumbnailsRelativePath: '.photo-organizer/thumbnails'
  physicalFolderPattern: 'year/month/region'
  logicalGroupsStoredInIndex: true
}

export const defaultOrganizationRules: OrganizationRules = {
  duplicateStrategy: 'exact-binary',
  fileOperation: 'copy',
  unknownRegionLabel: 'location-unknown',
  captureRegionLabel: 'capture',
  outputIndexRelativePath: '.photo-organizer/index.json',
  outputThumbnailsRelativePath: '.photo-organizer/thumbnails',
  physicalFolderPattern: 'year/month/region',
  logicalGroupsStoredInIndex: true
}
