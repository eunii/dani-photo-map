import { z } from 'zod'

export const movePhotosToGroupCommandSchema = z
  .object({
    outputRoot: z.string().min(1),
    photoIds: z.array(z.string().min(1)).min(1),
    /** 지도 상세 등 단일 소스가 명확할 때만 전달. 생략 시 인덱스에서 소스 그룹을 자동 분해합니다. */
    sourceGroupId: z.string().min(1).optional(),
    destinationGroupId: z.string().min(1).optional(),
    newGroup: z
      .object({
        /** 비어 있으면 `년/월` 바로 아래(그룹 폴더 없음)로 정리됩니다. */
        title: z.string()
      })
      .optional()
  })
  .refine((data) => data.destinationGroupId !== undefined || data.newGroup !== undefined, {
    message: 'destinationGroupId 또는 newGroup 중 하나는 필요합니다.'
  })
  .refine((data) => !(data.destinationGroupId && data.newGroup), {
    message: 'destinationGroupId와 newGroup은 동시에 쓸 수 없습니다.'
  })

export type MovePhotosToGroupCommand = z.infer<
  typeof movePhotosToGroupCommandSchema
>
