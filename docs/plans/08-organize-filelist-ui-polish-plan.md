# 사진 정리 상단 밀도 + 파일 목록 트리 UI 개선 (통합 계획)

이 문서는 이전에 논의한 **사진 정리(Organize) 화면 상단 밀도** 작업과, 추가 요청인 **파일 목록 > 폴더 트리 시각 개선**을 한 번에 구현하기 위한 계획입니다.

---

## A. 사진 정리 화면 (Organize)

### 목표

- `Source Library` 블록 세로 점유 축소.
- `GPS 없는 사진 그룹 기준`을 과한 한 블록이 아니라 보조 설정 수준으로 압축.
- `정리 시작하기`와 `신규 정리 후보 검토`가 스크롤 없이 더 빨리 보이도록 상단 스택 재배치.

### 변경 파일

- [src/presentation/renderer/pages/OrganizePage.tsx](../../src/presentation/renderer/pages/OrganizePage.tsx)

### 구현 방향

- Source 카드 패딩·`space-y-*` 간격 축소, 설명 문구 짧게.
- `정리 시작하기`가 Source 카드와 하단 액션 바에 중복이면 **한 곳만** 남기고 대표 위치 고정.
- GPS 기준 섹션: 제목 유지, 설명·폴더 패턴 안내는 짧게 또는 접기 가능한 보조 텍스트로.
- 액션 바의 긴 안내 문단은 한 줄 요약 또는 `previewResult` 있을 때만 상세 표시 등으로 축약.
- 전체 `space-y-6` 등 초반 구간만 간격을 줄여 검토 섹션을 위로 당김.

### 선택

- 상단 앱바 카피까지 줄일 경우: [src/presentation/renderer/app/App.tsx](../../src/presentation/renderer/app/App.tsx)의 `ROUTE_META.organize`, [src/presentation/renderer/components/app/AppTopbar.tsx](../../src/presentation/renderer/components/app/AppTopbar.tsx).

---

## B. 파일 목록 > 폴더 트리 (OutputFolderTreePanel)

### 목표

- 트리가 텍스트·`▸` 위주로 밋밋한 느낌을 줄이고, **아이콘·타이포·간격**으로 정돈된 탐색 UI로 개선.
- 스택 규칙 준수: **HeroUI** (`@heroui/react`)를 버튼·칩·패널 등에 활용 가능하면 사용.

### 변경 파일 (핵심)

- [src/presentation/renderer/components/OutputFolderTreePanel.tsx](../../src/presentation/renderer/components/OutputFolderTreePanel.tsx) — 폴더 트리 전체 (`TreeBranch`, 헤더 `폴더 트리`, `홈 (전체 보기)`).
- 소비처: [src/presentation/renderer/pages/FileListPage.tsx](../../src/presentation/renderer/pages/FileListPage.tsx) — 좌측 패널에만 삽입되므로 **트리 컴포넌트 내부** 집중 수정으로 충분.

### 구현 방향

1. **아이콘**
   - [src/presentation/renderer/components/app/AppIcons.tsx](../../src/presentation/renderer/components/app/AppIcons.tsx)에 `FolderIcon` / `FolderOpenIcon`(또는 확장 시 열림 상태) 등 **트리 전용** 아이콘을 추가하거나, 이미 있는 `ChevronRightIcon` 등과 조합.
   - 펼침 토글: `▸` 대신 `ChevronRightIcon` + 회전(`rotate-90` 등)으로 통일.
   - 루트 `홈 (전체 보기)` 행에 홈/라이브러리 느낌 아이콘.

2. **HeroUI**
   - 행 단위: `Button` (`variant`, `size`, `className`)로 행·토글을 감싸 포커스 링·호버 일관화.
   - 사진 수: `Chip` 또는 `Badge`(패키지에 있으면)로 `(N장)` 표시를 작은 보조 배지로 분리해 가독성 향상.
   - 패널 헤더: 필요 시 `Card`/`Card.Header` 패턴은 과하면 유지하되, 현재 `border-b` 헤더를 HeroUI `Button`/`Text`와 맞는 타이포로 정리.

3. **레이아웃·스타일**
   - 들여쓰기: `paddingLeft` 인라인 대신 `pl-*` + `depth` 기반 클래스 또는 동일 간격 유지하되 시각적 가이드(왼쪽 보더/라인)를 부드럽게.
   - 선택 행: 기존 accent 배경 유지, 모서리 `rounded-lg`, 아이콘·텍스트 정렬 `items-center gap-2`.
   - 리프 폴더: 자식 없을 때는 빈 칸 대신 **얇은 스페이서** 또는 동일 너비 유지로 정렬 맞춤.

4. **접근성**

   - 펼침 버튼 `aria-expanded`, 폴더 선택 버튼에 현재 경로 `aria-current` 등 기존 동작 유지·보강.

### 주의

- 트리 데이터 구조·`expandedKeys`·`onSelectPath` 계약은 유지. **표현만** 바꿈.
- HeroUI에 전용 Tree 위젯이 없으면 커스텀 `ul`/`li` + HeroUI `Button`/`Chip` 조합이 MVP에 적합 (프로젝트 내 `Accordion`은 지도 사이드바 등 다른 용도로 이미 사용 중).

---

## 구현 순서 제안

1. **OrganizePage** 상단 밀도 (사용자가 먼저 불만 제기한 흐름).
2. **OutputFolderTreePanel** 트리 시각 개선 (독립 변경, 회귀 범위 좁음).

---

## 검증

- 파일 목록 탭: 좌측 트리 펼침·접기·선택·홈 이동이 이전과 동일하게 동작.
- 키보드 포커스·스크롤 영역(`min-h-0` / `overflow-y-auto`) 유지.
