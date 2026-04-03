import { z } from 'zod'

export const mapGroupSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  photoCount: z.number().int().nonnegative(),
  latitude: z.number(),
  longitude: z.number()
})

export const scanPhotoLibraryIssueSeveritySchema = z.enum(['warning', 'error'])

export const scanPhotoLibraryIssueStageSchema = z.enum([
  'metadata-read',
  'hash',
  'region-resolve',
  'copy',
  'thumbnail'
])

export const scanPhotoLibraryIssueSchema = z.object({
  code: z.string().min(1),
  severity: scanPhotoLibraryIssueSeveritySchema,
  stage: scanPhotoLibraryIssueStageSchema,
  sourcePath: z.string().min(1),
  photoId: z.string().min(1).optional(),
  outputRelativePath: z.string().min(1).optional(),
  destinationPath: z.string().min(1).optional(),
  message: z.string().min(1)
})

export const scanPhotoLibraryResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  keptCount: z.number().int().nonnegative(),
  copiedCount: z.number().int().nonnegative(),
  skippedExistingCount: z.number().int().nonnegative(),
  groupCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  issues: z.array(scanPhotoLibraryIssueSchema),
  mapGroups: z.array(mapGroupSummarySchema)
})

export type ScanPhotoLibraryIssue = z.infer<typeof scanPhotoLibraryIssueSchema>
export type ScanPhotoLibraryResult = z.infer<
  typeof scanPhotoLibraryResultSchema
>
