# 01. 스캔/프리뷰 파이프라인 병렬화 계획

## 목표
- 대량 사진 라이브러리에서 스캔과 정리 프리뷰 대기 시간을 줄인다.
- 진행률 의미를 유지하면서도 디스크 I/O와 CPU를 더 효율적으로 사용한다.
- 추후 EXIF 최적화와 구조 리팩터링 전에 안전한 성능 기반을 만든다.

## 현재 상태 요약
- [`src/application/usecases/ScanPhotoLibraryUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/ScanPhotoLibraryUseCase.ts) 는 사진 목록을 순차 `await` 로 준비한다.
- 같은 유스케이스의 `preparePhotoRecord()` 는 각 사진마다 메타데이터 읽기와 SHA-256 계산을 직렬로 수행한다.
- [`src/application/services/buildExistingOutputHashSet.ts`](C:/workspace/cursor/Photo/src/application/services/buildExistingOutputHashSet.ts) 는 출력 폴더의 미스된 해시를 순차 계산한다.
- [`src/application/usecases/PreviewPendingOrganizationUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/PreviewPendingOrganizationUseCase.ts) 는 대표 프리뷰 이미지를 `Promise.all` 로 과도하게 병렬 생성할 수 있다.

## 병목 근거
```text
ScanPhotoLibraryUseCase
listPhotoFiles -> for await preparePhotoRecord -> finalizePreparedPhotos -> save index

PreviewPendingOrganizationUseCase
listPhotoFiles -> prepareCandidatePhoto -> group assembly -> Promise.all(previewDataUrl)
```

핵심 구간:
- `ScanPhotoLibraryUseCase` 의 `for (const [index, listedPhotoPath] of photoPaths.entries())`
- `preparePhotoRecord()` 내부의 `readMetadataSafely()` -> `createSha256Safely()`
- `buildExistingOutputHashSet()` 의 `for ... await hasher.createSha256(...)`
- `PreviewPendingOrganizationUseCase` 의 `representativePhotos: await Promise.all(...)`

## 설계 원칙
- 무제한 병렬화는 금지한다.
- 동시성은 명시적인 제한값을 가진 유틸로 제어한다.
- 진행률 계약은 유지한다. 사용자에게 보이는 `completed/total` 의미가 바뀌면 안 된다.
- 순서 의존 로직은 그대로 유지하고, 준비 단계만 제한된 병렬 처리로 옮긴다.
- 실패는 현재처럼 개별 사진 단위로 누적하고 전체 작업은 계속 진행한다.

## 제안 구현

### 1. 공통 동시성 유틸 추가
후보 파일:
- [`src/shared/utils/`](C:/workspace/cursor/Photo/src/shared/utils/)
- 또는 application 전용이면 [`src/application/services/`](C:/workspace/cursor/Photo/src/application/services/)

후보 API:
```ts
mapWithConcurrencyLimit<TInput, TOutput>(
  items: TInput[],
  limit: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]>
```

용도:
- 스캔 준비 단계
- 출력 해시 구축 단계
- 프리뷰 이미지 생성 단계

### 2. `ScanPhotoLibraryUseCase` 준비 단계 병렬화
대상:
- [`src/application/usecases/ScanPhotoLibraryUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/ScanPhotoLibraryUseCase.ts)

변경 방향:
- `photoPaths.entries()` 순차 루프를 제한된 병렬 map 으로 교체한다.
- 각 작업 결과는 원래 인덱스를 유지해 정렬 또는 `photoId` 생성 안정성을 지킨다.
- `onScanProgress` 는 각 작업 완료 시 원자적으로 증가한 카운터를 기반으로 호출한다.

주의점:
- `issues` 배열에 병렬 push 하면 순서가 뒤섞일 수 있다.
- 해결 방식은 두 가지 중 하나다.
  1. 각 worker 가 로컬 issue 배열을 만든 뒤 완료 후 병합
  2. 결과 객체에 `issues` 를 포함해 마지막에 flatten

권장:
- `PreparedPhotoRecord | null` 과 `issues[]` 를 함께 반환하는 구조로 바꾼다.

### 3. `buildExistingOutputHashSet` 병렬화
대상:
- [`src/application/services/buildExistingOutputHashSet.ts`](C:/workspace/cursor/Photo/src/application/services/buildExistingOutputHashSet.ts)

변경 방향:
- 저장 인덱스에 해시가 없는 출력 사진만 추려서 제한된 병렬 해시 계산
- 결과 수집은 메인 스레드에서 `recordHash()` 로 병합

주의점:
- `Set` 과 `Map` 을 worker 내부에서 직접 동시에 갱신하지 않는다.
- 각 worker 는 `[hash, outputRelativePath]` 또는 실패 정보만 반환한다.

### 4. `PreviewPendingOrganizationUseCase` 프리뷰 병렬화 안정화
대상:
- [`src/application/usecases/PreviewPendingOrganizationUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/PreviewPendingOrganizationUseCase.ts)

변경 방향:
- `prepareCandidatePhoto()` 단계도 제한된 병렬 처리
- `createPreviewDataUrlSafely()` 도 그룹별 `Promise.all` 대신 전체 제한 병렬 처리

권장 우선순위:
1. 후보 사진 준비 단계 병렬화
2. 프리뷰 data URL 생성 제한 병렬화

### 5. 동시성 설정값
초기값 제안:
- 메타데이터/해시 준비: `3` 또는 `4`
- 기존 출력 해시 계산: `2` 또는 `3`
- sharp 프리뷰 생성: `2`

이유:
- EXIF + 해시 + sharp 는 모두 I/O 와 CPU 비용이 섞여 있다.
- Electron 메인 프로세스 과부하를 피해야 한다.

## 단계별 작업 순서
1. 공통 동시성 유틸 추가
2. `buildExistingOutputHashSet` 먼저 병렬화
3. `PreviewPendingOrganizationUseCase` 의 후보 준비 단계 병렬화
4. `ScanPhotoLibraryUseCase` 의 준비 단계 병렬화
5. `PreviewPendingOrganizationUseCase` 의 프리뷰 생성 제한 병렬화
6. 필요 시 진행률 메시지 해석 보정

## 테스트 계획

### 자동 테스트
- 기존 테스트 유지:
  - [`src/application/usecases/ScanPhotoLibraryUseCase.test.ts`](C:/workspace/cursor/Photo/src/application/usecases/ScanPhotoLibraryUseCase.test.ts)
  - [`src/application/usecases/PreviewPendingOrganizationUseCase.test.ts`](C:/workspace/cursor/Photo/src/application/usecases/PreviewPendingOrganizationUseCase.test.ts)
  - [`src/application/services/buildExistingOutputHashSet.test.ts`](C:/workspace/cursor/Photo/src/application/services/buildExistingOutputHashSet.test.ts)

추가할 테스트:
- 동시성 유틸의 결과 순서 보장
- 일부 worker 실패 시 나머지 계속 처리
- 진행률 카운트가 누락/중복 없이 끝까지 도달하는지
- 순차 대비 결과 집합이 동일한지

### 수동 검증
1. 소량 사진(10~20장) 에서 결과 동일성 확인
2. 중간 규모(200~500장) 에서 진행률 자연스러움 확인
3. 중복 포함 폴더에서 duplicate/skippedExistingCount 동일성 확인
4. 프리뷰 그룹 썸네일이 누락 없이 보이는지 확인

## 성공 기준
- 동일 입력에서 결과 인덱스/중복 판정/이슈 수가 기존과 동일하다.
- 프리뷰와 실제 스캔의 체감 시간이 줄어든다.
- 진행률 표시가 역행하거나 멈춘 것처럼 보이지 않는다.
- 메인 프로세스가 과도하게 멈추거나 메모리 스파이크를 만들지 않는다.

## 리스크와 대응
- 리스크: `issues` 와 진행률 순서가 뒤섞임
  - 대응: worker 결과 객체를 병합하는 구조로 변경
- 리스크: sharp 와 해시가 동시에 몰려 CPU 스파이크 발생
  - 대응: 작업 종류별 제한값 분리
- 리스크: 테스트가 타이밍 의존적으로 flaky 해짐
  - 대응: 호출 횟수와 결과 값 검증 중심으로 작성

## 후속 단계와 연결
- 이 단계가 끝나면 2단계 EXIF 최적화 효과를 더 정확히 측정할 수 있다.
- 5단계 구조 리팩터링에서는 여기서 도입한 동시성 유틸을 스캔 단계 서비스로 옮길 수 있다.
