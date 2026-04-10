# 지도로 사진 보기 — 툴바·미리보기 레이아웃

## 목표

- 상단: 탭(사진 미리보기 / 그룹 상세) → 검색(약 절반 너비) → 날짜(시작/종료 한 줄) → 빠른 필터(전체·오늘·…) 아래행.
- 전역 글자 크기 한 단계 축소(탭·검색·필터·통계 칩·사이드바).
- **미리보기(우측) 열**: 내용이 넘칠 때 **세로 스크롤이 확실히 생기도록** 높이 체인(`min-h-0`)과 스크롤 영역(`overflow-y-auto`, 필요 시 [`app-scroll`](../../src/presentation/renderer/styles/index.css)) 정리.

## 관련 파일

- [`src/presentation/renderer/pages/BrowsePage.tsx`](../../src/presentation/renderer/pages/BrowsePage.tsx)
- [`src/presentation/renderer/components/map/MapFilterBar.tsx`](../../src/presentation/renderer/components/map/MapFilterBar.tsx)
- [`src/presentation/renderer/components/map/MapSearchBar.tsx`](../../src/presentation/renderer/components/map/MapSearchBar.tsx)
- [`src/presentation/renderer/components/map/MapPhotoSidebar.tsx`](../../src/presentation/renderer/components/map/MapPhotoSidebar.tsx)

## 작업 항목

### 1. MapFilterBar

- 1행: 시작일·종료일 한 줄(`flex`, 붙어 보이게).
- 2행: 빠른 필터 칩 + 조건부 초기화.
- 타이포·입력 높이 소폭 축소.

### 2. MapSearchBar

- 검색 입력 너비 약 50%(부모 기준 `max-w` / `md:w-1/2` 등).
- `h-9`, `text-xs` 등 축소.

### 3. BrowsePage

- 탭을 상단 카드 맨 위로 이동, 우측 열에서는 탭 제거.
- 통계 칩·탭 버튼 글자 축소.

### 4. MapPhotoSidebar

- 상단 「사진 미리보기」 헤더 중복 정리(탭과 겹침 최소화).
- 내부 제목 등 타이포 한 단계 축소.

### 5. 미리보기 열 스크롤 (추가)

- `BrowsePage` 그리드 우측 컬럼 래퍼에 `min-h-0`·`overflow-hidden`(또는 `flex flex-col min-h-0`)을 두어 flex 자식이 높이를 넘지 않게 함.
- `MapPhotoSidebar` 루트 `aside`는 고정 `min-h`를 유지하되, 내부 스크롤 구역에 `app-scroll` 적용해 스크롤바 스타일 통일.
- 스크롤이 안 생기는 경우는 대개 부모에 `min-h-0` 누락이므로, 지도+우측 행 전체 flex/grid 체인을 점검.

### 6. 검증

- `pnpm exec tsc --noEmit`
- 우측 미리보기에서 그룹·썸네일 목록이 길 때 세로 스크롤 동작 확인.

## 구현 TODO

- [x] MapFilterBar: 날짜 1행·칩 아래·타이포
- [x] MapSearchBar: 너비·타이포
- [x] BrowsePage: 탭 이동·우측 탭 제거·칩/탭 타이포·**우측 열 min-h-0**
- [x] MapPhotoSidebar: 헤더 정리·타이포·**스크롤 영역 app-scroll**
- [x] tsc
