# Dani Photo Map (다니 포토 맵)

로컬 사진 라이브러리를 정리하고, 정리 결과를 지도와 그룹 중심으로 탐색/편집할 수 있도록 만드는 Electron 데스크톱 앱입니다.

현재 프로젝트는 Electron + React + Vite 기반 MVP이며, 원본/출력 폴더 선택부터 스캔, EXIF/GPS 읽기, exact duplicate 처리, 복사, 썸네일 생성, `index.json` 저장, 그룹 편집, 지도 탐색까지 한 흐름으로 연결되어 있습니다.

## MVP 목표

- 사용자가 원본 사진 폴더를 선택
- 사용자가 출력 루트 폴더를 선택
- 이미지 파일을 재귀적으로 스캔
- EXIF 날짜 및 GPS 메타데이터 읽기
- SHA-256 기반 정확한 duplicate 검출
- 사진을 `year / month / region` 구조로 복사
- `.photo-organizer/index.json` 및 썸네일 생성
- 논리 그룹을 지도와 패널에서 탐색
- 그룹 메타데이터 수정
  - `title`
  - `companions`
  - `notes`
  - `representative photo`

## 현재 구현 상태

### 구현 완료

- Electron 메인 프로세스, preload bridge, React renderer 셸 구성
- clean architecture 기반 구조 유지
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- 원본 폴더 / 출력 폴더 선택 UI
- 선택한 경로 localStorage 저장 및 앱 재실행 시 복원
- 이미지 파일 재귀 스캔
- `exifr` 기반 날짜 / GPS 메타데이터 읽기
- 날짜 추출 우선순위 및 폴백
  - `DateTimeOriginal`
  - `CreateDate`
  - 파일 수정 시각
- SHA-256 기반 exact duplicate 처리
- duplicate canonical 선택 정책
  - 더 이른 사진 우선
  - 더 신뢰도 높은 날짜 출처 우선
- 출력 폴더 생성 및 경로 정규화
- 사진 복사 및 충돌/실패 리포트 수집
- 썸네일 생성
- `index.json` 저장/로드
- `zod` 기반 `index.json` 스키마 검증
- atomic save(임시 파일 후 rename)
- 그룹 생성 정책
  - 지역 기준
  - 느슨한 시간 기반 분리
  - 대표 사진 선정 정책 분리
- 그룹 상세 편집 UI
  - 제목 수정
  - 동행인 수정
  - 메모 수정
  - 대표 사진 변경
- 저장된 `index.json` 재로드 및 재실행 복원
- 지도/리스트/상세 패널 연동
- GPS 있는 그룹 / 없는 그룹 분리 UX
- 그룹명 추천 UI
  - 가까운 GPS 그룹 제목 추천
- 그룹 저장 시 출력 파일명 재정리
  - 그룹명 기반 파일명
  - `001`부터 시작하는 순번
  - 동일 규칙 파일명 충돌 시 최대 번호 `+1`
- curated region resolver + 메모리 캐시
- domain / application / infrastructure / presentation(view-model/mapper) 테스트 확장

### 현재 파일/저장 규칙

- 원본 파일은 수정하지 않음
- 기본 물리 구조는 `year / month / region`
- 논리 그룹/편집 정보는 `.photo-organizer/index.json`
- 썸네일은 `.photo-organizer/thumbnails/`
- 초기 organize 파일명은 날짜 기반
- 그룹 편집 후에는 그룹 제목 기준 파일명 재정리 가능
  - 예: `2026-04-03_1011_부산_당일치기_001.JPG`

### 현재 제한 사항

- 지역명 해석은 외부 reverse geocoding API가 아니라 curated bounding box 기반입니다. **서울 자치구·경기 31개 시·군·6대 광역시 구·세종·제주 2시·강원·충북·충남·전북·전남·경북·경남 시·군** 등에 대략 박스를 두었고, 미국은 주/일부 도시 등도 박스로 나눕니다. 박스 밖·좌표 오차는 상위 광역(예: `gangwon-do`, `busan`)이나 국가 단위로 떨어질 수 있습니다.
- 촬영 시각은 EXIF/XMP 등 임베디드 메타를 우선하며, 메타가 전혀 없으면 파일 수정 시각(mtime)으로만 추정합니다. 메일 첨부처럼 메타가 제거된 파일은 원본 촬영일을 복구할 수 없습니다.
- 대용량 스캔에 대한 실시간 진행률/취소 UI는 아직 없습니다.
- 실행 결과의 `issues`를 상세 패널로 보여주는 전용 UI는 아직 얕습니다.
- 그룹명 추천은 현재 근처 GPS 그룹 제목 재사용 중심의 1차 버전입니다.
- 그룹 편집 시 파일명 재정리는 들어갔지만, 변경 미리보기/적용 전 확인 UX는 아직 없습니다.

## 기술 스택

- Electron `41.1.1`
- React `19.2.4`
- React DOM `19.2.4`
- TypeScript `6.0.2`
- Vite `8.0.3`
- electron-vite `5.0.0`
- electron-builder `26.8.1`
- Tailwind CSS `4.2.2`
- HeroUI `3.0.1`
- MapLibre GL JS `5.21.1`
- exifr `7.1.3`
- sharp `0.34.5`
- zustand `5.0.12`
- zod `4.3.6`
- Vitest `4.1.2`
- pnpm

## 실행 방법

### 1. 의존성 설치

```bash
corepack pnpm install
```

설치 후 native/build 스크립트 승인이 필요할 수 있습니다. 목록이 나오면 `electron`, `esbuild`, `sharp`를 허용하세요.

```bash
corepack pnpm approve-builds
```

### 2. 개발 서버 실행

```bash
corepack pnpm dev
```

### 3. 타입 체크

```bash
corepack pnpm typecheck
```

### 4. 테스트 실행

```bash
corepack pnpm test
```

### 5. 프로덕션 빌드

```bash
corepack pnpm build
```

## 사용 흐름

앱을 실행한 뒤 다음 순서로 확인할 수 있습니다.

1. 원본 사진 폴더 선택
2. 출력 폴더 선택
3. `사진 정리 실행` 클릭
4. 실행 결과 카드 확인
  - 스캔 수
  - 유지 수
  - duplicate 수
  - 그룹 수
  - warning 수
  - failure 수
5. 저장된 `index.json` 기준으로 그룹 탐색
6. 지도 그룹 / GPS 없는 그룹 리스트 확인
7. 그룹 상세 패널에서 제목/동행인/메모/대표 사진 수정
8. 근처 그룹명 추천이 있으면 재사용, 없으면 직접 입력
9. 그룹 저장 시 관련 출력 파일명 재정리

## 현재 `index.json` 역할

`index.json`은 단순 요약 파일이 아니라 앱의 후속 로드/복원/편집 기준 데이터입니다.

포함 정보 예시:

- 버전
- 생성 시각
- source root / output root
- photo 목록
  - `sha256`
  - `capturedAt`
  - `capturedAtSource`
  - `gps`
  - `regionName`
  - `outputRelativePath`
  - `thumbnailRelativePath`
  - `isDuplicate`
  - `duplicateOfPhotoId`
  - `metadataIssues`
- group 목록
  - `groupKey`
  - `title`
  - `displayTitle`
  - `photoIds`
  - `representativePhotoId`
  - `representativeGps`
  - `representativeThumbnailRelativePath`
  - `companions`
  - `notes`

## 폴더 구조

```text
src/
  domain/
  application/
  infrastructure/
  presentation/
  shared/
```

각 레이어 역할:

- `domain`
  - 엔티티
  - 값 객체
  - 정책
  - 그룹/대표사진/duplicate/naming 규칙
- `application`
  - 유스케이스
  - 포트
  - DTO
  - 스캔/로드/그룹 업데이트 orchestration
- `infrastructure`
  - 파일시스템
  - EXIF
  - hashing
  - storage
  - thumbnail
  - geo resolver
- `presentation`
  - Electron main/preload
  - renderer UI
  - mapper / view-model
- `shared`
  - 공통 타입
  - 경로 유틸
  - 스키마 보조 타입

## 테스트 상태

현재 Vitest 기반 테스트가 아래 범위를 보호합니다.

- domain
  - `PhotoNamingService`
  - `GroupAwarePhotoNamingService`
  - `PhotoGroupingService`
  - `RepresentativePhotoPolicy`
  - `DuplicatePhotoPolicy`
- application
  - `ScanPhotoLibraryUseCase`
  - `LoadLibraryIndexUseCase`
  - `UpdatePhotoGroupUseCase`
- infrastructure
  - `ExifrPhotoMetadataReader`
  - `JsonLibraryIndexStore`
  - `NodePhotoLibraryFileSystem`
  - `CuratedRegionResolver`
  - path utils
- presentation
  - `toLibraryIndexView`
  - `groupExplorer`
  - `groupTitleSuggestions`

## 개발 메모

- 원본은 절대 수정하지 않고 copy 기준으로 유지합니다.
- duplicate는 exact binary duplicate만 처리합니다.
- 논리 그룹은 물리 폴더가 아니라 `index.json`에 저장합니다.
- 풍부한 메타데이터와 편집 정보는 파일명보다 `index.json`에 두는 방향을 유지합니다.
- 파일명 재정리는 사용자 탐색 편의용 파생 표현으로 다룹니다.

## 남은 개선 후보

현재 MVP 핵심 흐름은 대부분 구현됐고, 남은 일은 주로 제품 마감 품질 보강입니다.

- 실행 결과 `issues` 상세 UI
- 스캔 진행률 / 취소
- 파일명 재정리 미리보기 및 충돌 확인 UX
- 그룹 추천 정책 고도화
- 지역명 해석 정확도 개선
- 실제 대용량 사진 라이브러리 기준 수동 QA

