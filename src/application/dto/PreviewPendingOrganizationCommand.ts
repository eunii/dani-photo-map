import { z } from 'zod'

export const previewPendingOrganizationCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1)
})

export type PreviewPendingOrganizationCommand = z.infer<
  typeof previewPendingOrganizationCommandSchema
>
