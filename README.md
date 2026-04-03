# Photo Organizer

로컬 사진 라이브러리를 정리하고, 정리 결과를 지도 기반으로 탐색할 수 있도록 준비하는 Electron 데스크톱 앱입니다.

현재는 Electron + React + Vite 기반의 초기 프로젝트 구조와 실행 셸만 구성되어 있으며, 실제 사진 정리 로직은 아직 구현되지 않았습니다.

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

- Electron 메인 프로세스 구성
- Preload 브리지 기본 구조 구성
- React 렌더러 앱 셸 구성
- Tailwind CSS 연결
- Vitest 기본 설정 완료
- 클린 아키텍처 폴더 구조 준비 완료

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
- 현재 상태: 초기 스캐폴딩 완료, 비즈니스 로직 미구현

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

