import { z } from 'zod'

export const generateMissingThumbnailsCommandSchema = z.object({
  outputRoot: z.string().min(1),
  pathSegments: z.array(z.string())
})

export type GenerateMissingThumbnailsCommand = z.infer<
  typeof generateMissingThumbnailsCommandSchema
>
