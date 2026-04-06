import { z } from 'zod'

import {
  defaultMissingGpsGroupingBasis,
  missingGpsGroupingBases
} from '@domain/policies/MissingGpsGroupingBasis'

export const previewPendingOrganizationCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1),
  missingGpsGroupingBasis: z
    .enum(missingGpsGroupingBases)
    .default(defaultMissingGpsGroupingBasis)
})

export type PreviewPendingOrganizationCommand = z.infer<
  typeof previewPendingOrganizationCommandSchema
>
