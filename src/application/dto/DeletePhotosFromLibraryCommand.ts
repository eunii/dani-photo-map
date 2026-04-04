import { z } from 'zod'

export const deletePhotosFromLibraryCommandSchema = z.object({
  outputRoot: z.string().min(1),
  photoIds: z.array(z.string().min(1)).min(1)
})

export type DeletePhotosFromLibraryCommand = z.infer<
  typeof deletePhotosFromLibraryCommandSchema
>
