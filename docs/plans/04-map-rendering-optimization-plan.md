# 04. 지도 렌더링 최적화 계획

## 목표
- 그룹 수가 늘어도 지도 상호작용이 부드럽게 유지되도록 한다.
- 선택 변경, 검색 필터 변경, 줌/이동 시 불필요한 마커 재생성을 줄인다.
- 지도 데이터 갱신과 그룹 상세 로딩을 느슨하게 연결한다.

## 현재 상태 요약
대상 파일:
- [`src/presentation/renderer/components/map/PhotoGroupMap.tsx`](C:/workspace/cursor/Photo/src/presentation/renderer/components/map/PhotoGroupMap.tsx)
- [`src/presentation/renderer/components/GroupsMap.tsx`](C:/workspace/cursor/Photo/src/presentation/renderer/components/GroupsMap.tsx)
- [`src/presentation/renderer/view-models/map/mapPageSelectors.ts`](C:/workspace/cursor/Photo/src/presentation/renderer/view-models/map/mapPageSelectors.ts)
- [`src/presentation/renderer/pages/BrowsePage.tsx`](C:/workspace/cursor/Photo/src/presentation/renderer/pages/BrowsePage.tsx)

관찰:
- `PhotoGroupMap` 는 `source.setData()` 후 `clearMarkers()` 를 호출하고 HTML 마커를 전부 다시 만든다.
- `updateMarkerPresentation()` 는 `move`, `zoom`, `selectedGroupId` 변경마다 반복 실행된다.
- 선택 그룹이 바뀌면 상세 로딩과 지도 중심 이동이 함께 일어난다.
- `GroupsMap` 도 마커와 팝업을 반복 생성하는 구조다.

## 현재 문제 구간
핵심 구간:
- `clearMarkers()`
- `buildMarkerElement()`
- `useEffect(... source.setData(featureCollection) ... clearMarkers() ... for markerGroups ...)`
- `map.on('move', ...) -> updateMarkerPresentation()`

## 최적화 목표 분해
1. 데이터가 안 바뀐 마커는 재사용
2. 선택 상태만 바뀌면 스타일만 갱신
3. 사진 오버레이와 그룹 마커 갱신을 분리
4. viewport 변경 이벤트가 renderer 전체 재계산을 과도하게 유발하지 않게 조정

## 제안 구현

### 1. 마커 diff 업데이트 도입
권장 구조:
- `markersRef.current` 를 배열이 아니라 `Map<string, MarkerBinding>` 으로 전환
- key: `groupId`

변경 방식:
1. 새 `markerGroups` 를 순회
2. 기존에 있으면 위치/선택 상태만 갱신
3. 없으면 새로 생성
4. 새 목록에 없는 항목만 제거

효과:
- 전체 remove/add 반복 제거
- 썸네일 이미지 재로드 감소

### 2. `setData` 호출 최소화
현재 `featureCollection` 과 `photoFeatureCollection` 이 바뀔 때마다 전체 교체한다.

권장:
- 실제로 GeoJSON 이 달라졌을 때만 `setData`
- 선택 상태는 레이어 filter 와 HTML marker class 만 갱신

### 3. `updateMarkerPresentation()` 호출 경량화
현재:
- `move`
- `zoom`
- `selectedGroupId` 변경
- 초기 렌더 후 `requestAnimationFrame`

검토 포인트:
- move 중에는 표시 스타일 변경이 꼭 필요한지
- 줌 수준 변화에 따라 숨김/노출 로직이 없으면 move 이벤트에서의 호출 빈도를 낮출 수 있는지

권장:
- `move` 에서는 debounce 된 viewport 보고만 수행
- marker presentation 업데이트는 `zoomend`, `moveend`, `selectedGroupId` 중심으로 축소 검토

### 4. 상세 로딩과 지도 선택의 결합 완화
현재:
- `selectedGroupId` 변경 -> `useLibraryGroupDetail` 로 상세 로드 -> 선택 핀/포커스 로직 연쇄 실행

권장:
- 지도 선택은 즉시 반영
- 상세 패널 로딩은 지연되더라도 지도 마커 동작에는 영향 최소화
- 선택 그룹 중심 이동은 `pinLocation` 기준으로만 처리

## 단계별 작업 순서
1. `PhotoGroupMap` 마커 저장 구조를 `Map` 기반으로 재편
2. marker diff update 구현
3. `setData` 호출 조건 정리
4. `updateMarkerPresentation()` 트리거 축소
5. `GroupsMap` 에 동일 패턴 일부 적용
6. 필요 시 selector 메모이제이션 점검

## 검증 포인트

### 수동 시나리오
1. 그룹 100개 이상에서 검색어 입력
2. 날짜 필터 변경
3. 지도 이동/확대/축소 반복
4. 그룹 선택 반복
5. 사진 미리보기 overlay 열고 다른 그룹 선택
6. GPS 없는 그룹과 있는 그룹 사이 전환

확인 항목:
- 마커 깜빡임 감소
- 썸네일 재로딩 감소
- 선택 변경 반응 속도 개선
- 지도 이동 중 CPU 사용량 감소

### 자동 테스트 후보
- diff 함수가 추가/유지/삭제 대상을 정확히 판별하는지
- 선택 상태 업데이트가 재생성 없이 처리되는지
- selector 가 동일 입력에서 불필요하게 새 객체를 만들지 않는지

## 성공 기준
- 검색/필터/선택 시 전체 마커 재생성이 줄어든다.
- 그룹 수가 많은 상태에서도 지도 반응성이 유지된다.
- 선택 그룹 변경이 상세 로딩 지연과 별개로 부드럽게 보인다.

## 리스크와 대응
- 리스크: marker ref 관리 복잡도 증가
  - 대응: `MarkerBinding` 전용 유틸 함수로 분리
- 리스크: diff 버그로 stale marker 가 남을 수 있음
  - 대응: 개발 중 전체 재빌드 fallback 함수 유지
- 리스크: 선택/포커스 관련 버그
  - 대응: 그룹 선택, 사진 선택, overlay open 상태를 시나리오별로 검증

## 후속 단계와 연결
- 3단계 그룹 편집 UX 를 붙인 뒤에도 저장/리로드 시 지도 반응성을 유지하는 기반이 된다.
- 5단계 구조 정리 때는 지도 렌더 엔진 로직과 React view-model 을 더 명확히 분리할 수 있다.
