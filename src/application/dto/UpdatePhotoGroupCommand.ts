import { z } from 'zod'

export const updatePhotoGroupCommandSchema = z.object({
  outputRoot: z.string().min(1),
  groupId: z.string().min(1),
  title: z.string(),
  companions: z.array(z.string()),
  notes: z.string().optional(),
  representativePhotoId: z.string().optional()
})

export type UpdatePhotoGroupCommand = z.infer<typeof updatePhotoGroupCommandSchema>
