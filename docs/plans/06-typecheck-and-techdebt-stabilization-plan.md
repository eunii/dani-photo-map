# 06. 타입체크 및 기술부채 안정화 계획

## 목표
- 프로젝트 전체 타입체크 신뢰도를 회복한다.
- 테스트 더블과 실제 포트 타입 사이의 어긋남을 정리한다.
- renderer / shared / domain 경계에서 생기는 타입 누수를 줄인다.
- 이후 기능 추가와 배포 전에 "기본 안정화 단계"를 만든다.

## 왜 지금 필요한가
- 현재 핵심 기능은 동작하지만, 전체 `tsc` 기준으로는 기존 타입 오류가 남아 있어 유지보수 비용이 커질 수 있다.
- 특히 테스트 더블, command default 타입, renderer view-model null 처리, `GroupDetail` 타입 확장에 따른 테스트 fixture 누락이 반복될 가능성이 크다.
- 배포 전 기술부채를 한 번 정리해두면 이후 작은 기능 추가 때 회귀를 빨리 잡을 수 있다.

## 우선 정리할 문제군

### 1. 테스트 더블과 포트 타입 불일치
대상 파일:
- `src/application/ports/ExistingOutputScannerPort.ts`
- `src/application/usecases/ScanPhotoLibraryUseCase.test.ts`
- `src/application/usecases/PreviewPendingOrganizationUseCase.test.ts`
- `src/application/usecases/UpdatePhotoGroupUseCase.test.ts`

현재 관찰:
- `ExistingOutputScannerPort` 는 `scan`, `scanGroupSummaries`, `scanGroupPhotos` 를 모두 요구한다.
- 여러 테스트에서는 `scan` 만 가진 mock 객체를 넘기고 있어 전체 타입체크 시 오류 원인이 된다.

정리 방향:
- 테스트 공용 mock factory 추가
- 최소 구현 메서드 전체를 포함하되, 사용하지 않는 메서드는 `vi.fn()` 기본값 제공

권장 결과:
- 포트 변경 시 테스트 더블도 한곳만 수정하면 되게 정리

### 2. command schema default 와 테스트 입력 타입 괴리
대상 파일:
- `src/application/dto/ScanPhotoLibraryCommand.ts`
- `src/application/dto/PreviewPendingOrganizationCommand.ts`
- 관련 use case 테스트 전반

현재 관찰:
- zod schema 에서는 `.default(...)` 를 두었지만, 타입 추론 상 호출부에서 `missingGpsGroupingBasis` 를 요구하는 케이스가 남아 있다.

정리 방향:
- command 입력 타입과 execute 입력 타입을 분리 검토
- 또는 테스트용 helper 함수에서 기본값을 주입

권장 결과:
- 실제 런타임 기본값과 타입 시스템이 일치

### 3. renderer view-model null / narrowing 이슈
대상 파일:
- `src/presentation/renderer/view-models/map/mapPageSelectors.ts`

현재 관찰:
- `buildSelectedGroupPhotoPins()` 에서 `null` 을 섞어 만든 뒤 type predicate 로 좁히는 구간이 전체 타입체크에서 불안정할 수 있다.

정리 방향:
- `null` 제거 전용 helper 사용
- 또는 명시적 중간 타입 도입

권장 결과:
- `MapPhotoPinRecord[]` 반환 경로가 명확해짐

### 4. 테스트 fixture와 확장된 view 타입 어긋남
대상 파일:
- `src/shared/types/preload.ts`
- `src/presentation/renderer/view-models/flattenLibraryPhotos.test.ts`
- `src/presentation/renderer/view-models/groupExplorer.test.ts`
- `src/presentation/renderer/view-models/groupTitleSuggestions.test.ts`

현재 관찰:
- `GroupDetail` 에 `pathSegments` 같은 필드가 추가됐는데, 일부 테스트 fixture 는 이전 구조를 그대로 사용 중일 가능성이 있다.

정리 방향:
- 테스트 fixture builder 도입
- 최소 공통 `createGroupDetailFixture()` 추가

### 5. Node 타입/환경 타입 경계
대상 파일:
- `tsconfig.node.json`
- `tsconfig.web.json`
- `src/application/usecases/DeleteOutputFolderSubtreeUseCase.ts`
- `src/application/usecases/MovePhotosToGroupUseCase.ts`
- `src/shared/utils/pathScope.ts`

현재 관찰:
- 전체 타입체크 시 `node:path`, `node:crypto` 관련 환경 타입 오류가 보일 수 있다.
- web/node 타입 범위가 섞였을 가능성이 있다.

정리 방향:
- node 전용 코드가 어떤 tsconfig 에 포함되는지 다시 점검
- web include 범위를 재조정하거나 공용/환경별 타입 분리

## 작업 순서
1. 테스트 공용 mock / fixture factory 도입
2. `ExistingOutputScannerPort` 관련 테스트 전부 정리
3. command default 타입 정합성 수정
4. renderer view-model narrowing 오류 수정
5. `GroupDetail` fixture 누락 테스트 보정
6. tsconfig 범위와 Node 타입 경계 재점검
7. 마지막에 전체 `pnpm typecheck` 통과 목표

## 실제 착수 순서

### Phase A. 테스트 더블 / fixture 기반 정리
목표:
- 전체 오류 수를 가장 빠르게 줄이는 구간부터 정리

세부 단계:
1. `ExistingOutputScannerPort` 용 테스트 mock factory 추가
2. `ScanPhotoLibraryUseCase.test.ts` 에 factory 적용
3. `PreviewPendingOrganizationUseCase.test.ts` 에 factory 적용
4. `UpdatePhotoGroupUseCase.test.ts` 에 factory 적용
5. `GroupDetail` fixture builder 추가
6. `flattenLibraryPhotos.test.ts`, `groupExplorer.test.ts`, `groupTitleSuggestions.test.ts` 에 공통 fixture 적용

권장 파일 후보:
- `src/test/factories/createExistingOutputScannerPortMock.ts`
- `src/test/factories/createGroupDetailFixture.ts`

완료 기준:
- 테스트 fixture / port mock 관련 타입 오류가 대부분 사라진다.

### Phase B. command 입력 타입 정합성 정리
목표:
- zod runtime default 와 TypeScript 호출 타입을 맞춘다.

세부 단계:
1. `ScanPhotoLibraryCommand` 와 실제 execute 입력 타입 사용처 확인
2. `PreviewPendingOrganizationCommand` 도 같은 방식으로 정리
3. 선택지:
   - 입력 타입을 `z.input<typeof schema>` 기반으로 바꾸기
   - 또는 use case 경계에서 별도 `Request` 타입을 정의하기
4. 테스트 호출부에서 불필요하게 `missingGpsGroupingBasis` 를 강제하지 않도록 정리

권장 결정:
- schema 기반 유스케이스 입력 타입은 `input` 기준으로 받고, 내부에서 parse 후 default 적용

완료 기준:
- 테스트 파일에서 `missingGpsGroupingBasis` 누락 관련 타입 오류가 사라진다.

### Phase C. renderer view-model 안정화
목표:
- null filtering / type predicate 구간을 더 명확하게 만든다.

세부 단계:
1. `mapPageSelectors.ts` 의 `buildSelectedGroupPhotoPins()` 반환 경로 정리
2. `null` 포함 map 결과를 별도 intermediate type 으로 분리
3. 필요하면 `isPresent()` 같은 공용 type guard 추가

완료 기준:
- `MapPhotoPinRecord[]` 관련 narrowing 오류 제거
- view-model 테스트 유지

### Phase D. tsconfig / 환경 타입 경계 정리
목표:
- Node 전용 코드가 web 타입체크에 끌려들어오지 않게 한다.

세부 단계:
1. `tsconfig.web.json` include 범위 재검토
2. renderer 에 실제 필요한 application/domain/shared 범위만 남길 수 있는지 확인
3. `node:path`, `node:crypto` 오류가 나는 파일이 web 범위에 들어오는 이유 확인
4. 필요한 경우:
   - include 범위 축소
   - 파일 분리
   - presentation/common/shared 경계 재조정

완료 기준:
- web 타입체크가 브라우저 범위 바깥 코드 때문에 실패하지 않는다.

## 파일별 우선순위 체크리스트

### 먼저 수정할 가능성이 높은 파일
- `src/application/usecases/ScanPhotoLibraryUseCase.test.ts`
- `src/application/usecases/PreviewPendingOrganizationUseCase.test.ts`
- `src/application/usecases/UpdatePhotoGroupUseCase.test.ts`
- `src/presentation/renderer/view-models/map/mapPageSelectors.ts`
- `src/presentation/renderer/view-models/flattenLibraryPhotos.test.ts`
- `src/presentation/renderer/view-models/groupExplorer.test.ts`
- `src/presentation/renderer/view-models/groupTitleSuggestions.test.ts`

### 그 다음 확인할 파일
- `src/application/dto/ScanPhotoLibraryCommand.ts`
- `src/application/dto/PreviewPendingOrganizationCommand.ts`
- `tsconfig.web.json`
- `tsconfig.node.json`

## 추천 작업 단위

### 작업 단위 1
- 테스트 mock / fixture factory 추가
- 관련 테스트 3~6개 파일 동시 정리

### 작업 단위 2
- command 입력 타입 정합성 수정
- 관련 use case 테스트 재정리

### 작업 단위 3
- renderer view-model narrowing 수정
- 관련 presentation 테스트 재실행

### 작업 단위 4
- tsconfig / 환경 경계 수정
- 마지막 전체 `pnpm typecheck`

## 실행 커맨드 기준

### 국소 검증
- `pnpm vitest run src/application/usecases/ScanPhotoLibraryUseCase.test.ts`
- `pnpm vitest run src/application/usecases/PreviewPendingOrganizationUseCase.test.ts`
- `pnpm vitest run src/presentation/renderer/view-models/map/mapPageSelectors.test.ts`

### 최종 검증
- `pnpm typecheck`
- `pnpm test`

## 구현 시작 시 첫 액션 추천
가장 먼저 할 일은 이것입니다.

1. `ExistingOutputScannerPort` mock factory 추가
2. `GroupDetail` fixture factory 추가
3. 해당 factory 로 테스트 파일부터 정리

이유:
- 가장 많은 타입 오류를 짧은 변경으로 줄일 가능성이 높다.
- 이후 command 타입/tsconfig 정리가 훨씬 읽기 쉬워진다.

## 권장 산출물
- `src/test/factories/` 또는 가까운 테스트 유틸 위치에 factory 추가
- 타입 오류 목록을 카테고리별로 정리한 체크리스트
- 전체 typecheck 통과 상태

## 검증 계획
- `pnpm typecheck`
- 관련 테스트 스위트 재실행
- renderer 쪽 view-model 테스트 재실행

## 성공 기준
- 전체 `pnpm typecheck` 가 통과한다.
- 포트/fixture 변경 시 테스트 수정 범위가 줄어든다.
- renderer / shared / application 간 타입 경계가 더 예측 가능해진다.

## 리스크
- 작은 타입 오류처럼 보여도 tsconfig 경계 조정은 영향 범위가 커질 수 있다.
- 테스트 fixture 공통화 과정에서 기존 테스트 가독성이 잠시 떨어질 수 있다.

## 완료 후 기대 효과
- 배포 전 안정감 상승
- 다음 기능 추가 때 타입 에러로 인한 흐름 끊김 감소
- 리팩터링 속도 향상
