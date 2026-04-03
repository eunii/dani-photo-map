# Photo Organizer

로컬 사진 라이브러리를 정리하고, 정리 결과를 지도 기반으로 탐색할 수 있도록 만드는 Electron 데스크톱 앱입니다.

현재는 Electron + React + Vite 기반의 MVP 초기 흐름이 연결되어 있으며, 원본/출력 폴더 선택, 사진 스캔, EXIF 읽기, SHA-256 중복 검사, 결과 복사, `index.json` 생성, 지도/그룹 패널 표시까지 동작하는 상태입니다.

## 프로젝트 개요

이 프로젝트의 MVP 목표는 다음과 같습니다.

- 사용자가 원본 사진 폴더를 선택
- 사용자가 출력 루트 폴더를 선택
- 이미지 파일을 재귀적으로 스캔
- EXIF 날짜 및 GPS 메타데이터 읽기
- SHA-256 기반 정확한 중복 검사
- 사진을 `year / month / region` 구조로 복사
- 파일명을 `YYYY-MM-DD_HHMMSS_originalFileName.ext` 형식으로 변경
- `.photo-organizer/index.json` 및 썸네일 생성
- 논리적 그룹을 지도에 표시

## 현재 상태

구현 완료:

- Electron 메인 프로세스, preload 브리지, React 렌더러 셸 구성
- 클린 아키텍처 기반 폴더 구조 준비
- 원본 폴더 / 출력 폴더 선택 UI
- 선택한 폴더 경로 로컬 저장 및 앱 재실행 시 복원
- 이미지 파일 재귀 스캔
- `exifr` 기반 EXIF 날짜 / GPS 메타데이터 읽기
- SHA-256 기반 exact duplicate 검사
- 사진을 `year / month / region` 구조로 복사
- 파일명을 `YYYY-MM-DD_HHMMSS_originalFileName.ext` 형식으로 생성
- `.photo-organizer/index.json` 저장
- 썸네일 생성
- 결과 그룹 요약 및 지도(MapLibre) 표시
- 그룹 리스트 패널과 지도 간 선택 연동
- Vitest 기본 테스트 및 타입체크 구성

현재 제한 사항:

- 지역명 해석은 아직 실제 reverse geocoding이 아니며 fallback 값(`location-unknown`) 중심으로 동작
- 그룹 정책은 현재 단순한 초기 버전
- 그룹 상세 편집(title, companions, notes, representative photo)은 아직 미구현
- 지도는 결과 표시 뼈대 중심이며 상세 인터랙션은 미완성

## 기술 스택

- Electron 41
- React 19
- TypeScript 6
- Vite 8
- electron-vite 5
- Tailwind CSS 4
- HeroUI 3
- Vitest 4
- pnpm

## 실행 방법

### 1. 의존성 설치

```bash
corepack pnpm install
```

설치 후 빌드 스크립트 승인이 필요할 수 있습니다. 목록이 나오면 `electron`, `esbuild`, `sharp`를 허용하세요.

```bash
corepack pnpm approve-builds
```

### 2. 개발 서버 실행

```bash
corepack pnpm dev
```

앱을 실행한 뒤 다음 순서로 확인할 수 있습니다.

1. 원본 사진 폴더 선택
2. 출력 폴더 선택
3. `사진 정리 실행` 버튼 클릭
4. 결과 요약 카드, 지도, 그룹 패널 확인

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

## 기본 정보

- 패키지명: `photo-organizer`
- 버전: `0.1.0`
- 패키지 매니저: `pnpm@10.33.0`
- 앱 타입: Electron 데스크톱 앱
- 현재 상태: MVP 초기 흐름 구현 진행 중

## 폴더 구조

```text
src/
  domain/
  application/
  infrastructure/
  presentation/
  shared/
```

각 폴더의 역할은 다음과 같습니다.

- `domain`: 엔티티, 값 객체, 정책 등 핵심 도메인 모델
- `application`: 유스케이스와 포트, DTO
- `infrastructure`: 파일시스템, EXIF, 해시, 저장소 등 외부 구현
- `presentation`: Electron 메인/프리로드, React UI
- `shared`: 공통 타입과 유틸리티

## 개발 메모

- 원본 사진은 수정하지 않고 복사 기준으로 처리합니다.
- 물리 폴더 구조는 단순하게 유지합니다.
- 풍부한 메타데이터는 파일명이 아니라 `index.json`에 저장하는 방향을 따릅니다.

## 앞으로 해야 할 일

우선순위가 높은 다음 작업은 아래와 같습니다.

### 1. 메타데이터와 그룹 품질 개선

- 실제 지역명 해석 전략 추가
- GPS가 없는 사진 처리 정책 보강
- 그룹 생성 정책 고도화
- 대표 사진 선정 정책 분리

### 2. 그룹 상세 UI 추가

- 선택된 그룹 상세 패널
- 대표 사진 썸네일 표시
- 그룹 제목 수정
- 동행인(companions) 편집
- 메모(notes) 편집
- 대표 사진 변경

### 3. 인덱스/결과 모델 고도화

- `index.json` 스키마 명확화
- 그룹/사진 메타데이터 구조 정리
- 후속 편집 내용 저장/불러오기
- 오류 및 경고 정보 구조화

### 4. 인프라 안정화

- 파일 충돌 처리 정책
- 실패한 파일에 대한 리포트
- 썸네일 생성 실패 복구 전략
- 대용량 폴더 스캔 시 진행률 및 취소 처리

### 5. 지도 경험 개선

- 선택 그룹 하이라이트 강화
- 그룹 카드와 마커 상호작용 확장
- 결과 필터링
- 지도 중심/줌 상태 개선

### 6. 테스트 확장

- 도메인 정책 테스트 확대
- 유스케이스 테스트 추가
- 인프라 어댑터 테스트
- preload/main/renderer 연결 테스트 전략 정리

