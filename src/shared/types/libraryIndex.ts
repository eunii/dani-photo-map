import { z } from 'zod'

import {
  LIBRARY_INDEX_VERSION
} from '@domain/entities/LibraryIndex'
import {
  missingGpsCategories,
  photoCapturedAtSources,
  photoLocationSources
} from '@domain/entities/Photo'

const isoDateTimeStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Expected an ISO datetime string.'
  })

export const photoTimestampSchema = z.object({
  iso: isoDateTimeStringSchema,
  year: z.string().regex(/^\d{4}$/),
  month: z.string().regex(/^\d{2}$/),
  day: z.string().regex(/^\d{2}$/),
  time: z.string().regex(/^\d{6}$/)
})

export const geoPointSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite()
})

export const photoSchema = z.object({
  id: z.string().min(1),
  sourcePath: z.string().min(1),
  sourceFileName: z.string().min(1),
  sha256: z.string().min(1).optional(),
  duplicateOfPhotoId: z.string().min(1).optional(),
  capturedAt: photoTimestampSchema.optional(),
  capturedAtSource: z.enum(photoCapturedAtSources).optional(),
  originalGps: geoPointSchema.optional(),
  gps: geoPointSchema.optional(),
  locationSource: z.enum(photoLocationSources).optional(),
  missingGpsCategory: z.enum(missingGpsCategories).optional(),
  manualGroupId: z.string().min(1).optional(),
  manualGroupTitle: z.string().min(1).optional(),
  regionName: z.string().min(1).optional(),
  outputRelativePath: z.string().min(1).optional(),
  thumbnailRelativePath: z.string().min(1).optional(),
  isDuplicate: z.boolean(),
  metadataIssues: z.array(z.string().min(1))
})

export const photoGroupSchema = z.object({
  id: z.string().min(1),
  groupKey: z.string().min(1),
  title: z.string(),
  displayTitle: z.string(),
  photoIds: z.array(z.string().min(1)),
  representativePhotoId: z.string().min(1).optional(),
  representativeGps: geoPointSchema.optional(),
  representativeThumbnailRelativePath: z.string().min(1).optional(),
  companions: z.array(z.string().min(1)),
  notes: z.string().min(1).optional()
})

export const libraryIndexSchema = z.object({
  version: z.literal(LIBRARY_INDEX_VERSION),
  generatedAt: isoDateTimeStringSchema,
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1),
  photos: z.array(photoSchema),
  groups: z.array(photoGroupSchema)
})

const libraryIndexEnvelopeSchema = z.object({
  version: z.number().int().positive()
})

export type LibraryIndexDocument = z.infer<typeof libraryIndexSchema>

export function parseLibraryIndexDocument(value: unknown): LibraryIndexDocument {
  const envelope = libraryIndexEnvelopeSchema.parse(value)

  switch (envelope.version) {
    case LIBRARY_INDEX_VERSION:
      return libraryIndexSchema.parse(value)
    default:
      throw new Error(`Unsupported library index version: ${envelope.version}`)
  }
}
