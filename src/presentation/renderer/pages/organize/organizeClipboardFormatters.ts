import type { PreviewPendingOrganizationResult } from '@shared/types/preload'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

export function formatIncrementalSkipListForClipboard(
  rows: PreviewPendingOrganizationResult['skippedUnchangedDetails']
): string {
  return rows
    .map(
      (row) =>
        [
          `sourceFileName: ${row.sourceFileName}`,
          `sourcePath: ${row.sourcePath}`,
          `sizeBytes: ${row.sourceFingerprint.sizeBytes}`,
          `modifiedAtMs: ${row.sourceFingerprint.modifiedAtMs}`
        ].join('\n')
    )
    .join('\n\n')
}

export function formatDuplicateListForClipboard(
  rows: Array<{
    canonicalSourcePath: string
    duplicateSourcePaths: string[]
  }>
): string {
  return rows
    .map((row) =>
      [
        `canonical: ${row.canonicalSourcePath}`,
        ...row.duplicateSourcePaths.map((path) => `duplicate: ${path}`)
      ].join('\n')
    )
    .join('\n\n')
}

export function formatExistingSkipListForClipboard(
  rows: ScanPhotoLibrarySummary['existingOutputSkipDetails']
): string {
  return rows
    .map((row) =>
      [
        `sourcePhotoId: ${row.sourcePhotoId}`,
        `sourcePath: ${row.sourcePath}`,
        `existingOutputRelativePath: ${row.existingOutputRelativePath}`,
        `sha256: ${row.sha256}`
      ].join('\n')
    )
    .join('\n\n')
}

export function formatIssueListForClipboard(
  rows: ScanPhotoLibrarySummary['issues']
): string {
  return rows
    .map((issue) =>
      [
        `severity: ${issue.severity}`,
        `stage: ${issue.stage}`,
        `code: ${issue.code}`,
        `sourcePath: ${issue.sourcePath}`,
        issue.photoId ? `photoId: ${issue.photoId}` : null,
        issue.outputRelativePath
          ? `outputRelativePath: ${issue.outputRelativePath}`
          : null,
        issue.destinationPath ? `destinationPath: ${issue.destinationPath}` : null,
        `message: ${issue.message}`
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n')
    )
    .join('\n\n')
}
