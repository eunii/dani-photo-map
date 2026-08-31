/** `applyRenamePlan`이 동시에 진행하는 파일 이동(rename) 작업 수. */
export const RENAME_MOVE_CONCURRENCY_LIMIT = 6

/**
 * 이 개수만큼 사진 이동이 완료될 때마다 인덱스를 중간 저장(checkpoint)한다.
 * 테스트 픽스처(보통 2~3장)보다 커야 소규모 케이스에서 저장 횟수가 늘어나지 않는다.
 */
export const RENAME_SAVE_CHECKPOINT_BATCH_SIZE = 40
