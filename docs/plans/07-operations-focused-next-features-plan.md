# 07. 운영성 중심 다음 기능 계획

## 목표
- MVP 핵심 흐름이 이미 동작하는 상태에서, 사용자가 실제 사진 라이브러리를 더 안정적으로 운영할 수 있게 한다.
- "한 번 정리하고 끝"이 아니라, 재검토, 재스캔, duplicate 판단, 실패 복구 같은 반복 작업을 더 편하게 만든다.

## 우선순위 원칙
다음 기능은 화려한 기능보다 아래 기준을 우선한다.

1. 이미 수집하고 있는 데이터를 더 잘 보여주는가
2. 대량 라이브러리 운영에서 시간을 줄여주는가
3. 실패/경고 상황을 다시 처리할 수 있게 해주는가
4. 기존 MVP 구조를 크게 흔들지 않고 확장 가능한가

## 추천 우선순위

### P1. 실행 결과 `issues` 검토 화면 강화
현재 근거:
- `OrganizePage` 에 이미 `warningCount`, `failureCount`, `issues`, `existingOutputSkipDetails`, `inBatchDuplicateDetails` 가 모인다.
- 지금도 결과를 일부 보여주지만, 운영용 "다시 보기" 화면으로는 아직 얕다.

관련 파일:
- `src/presentation/renderer/pages/OrganizePage.tsx`
- `src/shared/types/preload.ts`

기능 목표:
- warning / error / duplicate / skipped-existing 을 탭 또는 필터로 나눠 보기
- 경로별, stage별, code별 정렬/검색
- 복사 실패/메타데이터 실패 항목만 따로 재검토

1차 구현 범위:
- Organize 결과 패널의 상세 보기 강화
- `stage`, `code`, `sourcePath` 컬럼 노출
- severity 별 필터

2차 확장:
- "이 항목만 다시 시도" 같은 재처리 액션 검토

### P2. 증분 재스캔
현재 문제:
- 소스 폴더 전체를 다시 읽는 비용이 여전히 클 수 있다.
- 사용자는 새 사진 몇 장만 추가해도 전체 프리뷰/정리를 다시 돌릴 수 있다.

관련 파일:
- `src/application/usecases/ScanPhotoLibraryUseCase.ts`
- `src/application/usecases/PreviewPendingOrganizationUseCase.ts`
- `src/application/services/buildExistingOutputHashSet.ts`
- `src/domain/entities/LibraryIndex.ts`

기능 목표:
- 기존 `index.json` 과 비교해서 이미 처리된 입력을 빠르게 건너뛴다.
- 새 파일 / 변경 파일 중심으로만 준비 단계 실행

권장 1차 설계:
- 입력 파일 fingerprint 후보:
  - sourcePath
  - file size
  - modified time
- 기존 index 와 비교해 unchanged 판단

주의:
- 완전 신뢰 가능한 캐시 키 설계가 중요
- path 이동이나 이름 변경 처리 정책을 먼저 정해야 함

### P3. duplicate 검토 UX
현재 상태:
- exact duplicate 자체는 이미 판정한다.
- `inBatchDuplicateDetails`, `existingOutputSkipDetails` 도 결과에 포함된다.

관련 파일:
- `src/presentation/renderer/pages/OrganizePage.tsx`
- `src/shared/types/preload.ts`

기능 목표:
- 왜 duplicate 로 판단됐는지 보여주기
- 원본 경로와 canonical 비교
- "이번 스캔에서 건너뛴 사진"을 사람이 검토하기 쉽게 제공

1차 구현 범위:
- duplicate 결과 카드 별도 섹션
- canonical source / skipped existing target 경로 표시

### P4. 파일명 재정리 미리보기 및 적용 확인 UX
현재 상태:
- 그룹 저장 시 파일명이 재정리되지만, 적용 전 preview 가 약하다.

관련 파일:
- `src/presentation/renderer/components/GroupDetailPanel.tsx`
- `src/application/usecases/UpdatePhotoGroupUseCase.ts`

기능 목표:
- 저장 전 예상 변경 파일명 목록 미리 보기
- 충돌 가능성, 변경 건수, 영향 범위 표시

### P5. 자동 업데이트 검토는 마지막
현재 상태:
- 수동 배포/수동 업데이트는 가능
- 자동 업데이트는 아직 없음

권장:
- 위 운영성 기능이 안정화된 뒤 검토
- 지금 단계에서는 우선순위를 낮게 둔다

## 추천 구현 순서
1. `issues` 결과 검토 화면 강화
2. duplicate 검토 UX
3. 파일명 재정리 미리보기
4. 증분 재스캔
5. 자동 업데이트 검토

## 화면별 제안

### OrganizePage
강화 후보:
- 실행 결과 요약 카드
- warning/error/duplicate/skipped 필터
- 상세 행 확장

### BrowsePage / FileListPage
강화 후보:
- 최근 변경 그룹 보기
- duplicate 관련 탐색 진입점

### 설정 UI (`SettingsDrawer` 등)
강화 후보:
- 앱 버전
- 배포 채널/업데이트 정책 안내

## 단계별 산출물 예시

### Phase 1
- Organize 결과 검토 UI 개선
- duplicate 상세 표 정리

### Phase 2
- rename preview UX
- 이동/저장 전 영향 범위 표시

### Phase 3
- 증분 재스캔 초안
- 캐시 키 / unchanged 판정 정책

## 검증 기준
- 사용자가 "무엇이 실패했고 무엇이 건너뛰어졌는지" 바로 이해할 수 있다.
- 몇 장만 추가된 라이브러리에서 전체 재스캔 부담이 줄어든다.
- duplicate 와 파일명 변경이 더 설명 가능해진다.

## 리스크
- 증분 재스캔은 캐시 정책이 약하면 오탐/누락 위험이 있다.
- duplicate UX 는 정보가 많아지면 오히려 복잡해질 수 있다.
- rename preview 는 실제 rename 정책과 항상 일치해야 한다.

## 완료 후 기대 효과
- MVP가 "한 번 동작하는 데모"가 아니라 실제로 반복 사용 가능한 데스크톱 앱에 가까워진다.
- 사용자는 실패 원인, duplicate 처리, 변경 영향 범위를 더 잘 이해할 수 있다.
