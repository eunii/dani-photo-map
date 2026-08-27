# 파일 목록을 실제 출력 경로 기준으로 표시

파일 목록 트리와 그리드를 그룹의 ‘다수 폴더’가 아니라, 인덱스에 있는 각 사진의 실제 출력 경로(`outputRelativePath`) 기준으로 보여 줍니다. week1 월 병합 등 그룹 저장 동작은 바꾸지 않습니다.

## 원인

파일 목록은 지금 [src/presentation/renderer/pages/fileList/useFileListPathAndRows.ts](src/presentation/renderer/pages/fileList/useFileListPathAndRows.ts)에서 **그룹 1개 = 경로 1개**로 트리를 만듭니다. 경로는 [src/presentation/common/mappers/toLibraryIndexView.ts](src/presentation/common/mappers/toLibraryIndexView.ts)의 `pickPathSegments`가 그 그룹 사진 중 **가장 많은 폴더**를 고른 값입니다.

그래서 `week1`처럼 제목이 같은 그룹이 3월+5월을 품으면, 트리는 `2024/03/week1`만 보여 주고 `2024/05/week1`은 숨깁니다. 디스크와 인덱스의 `outputRelativePath`에는 5월 week1·week2 파일이 그대로 있습니다.

경로 기준 트리/필터는 이미 [src/presentation/renderer/view-models/outputPathNavigation.ts](src/presentation/renderer/view-models/outputPathNavigation.ts)에 있습니다 (`buildOutputFolderTree`, `filterRowsAtPath`, `listSubfoldersAtPath`, `countPhotosInSubtree`). 파일 목록이 이걸 안 쓰고 [src/presentation/renderer/view-models/groupFolderNavigation.ts](src/presentation/renderer/view-models/groupFolderNavigation.ts)만 씁니다.

```mermaid
flowchart LR
  disk["디스크 2024/05/week1"]
  photos["photo.outputRelativePath"]
  group["그룹 week1 다수경로 2024/03"]
  uiNow["지금 파일 목록"]
  uiNext["바꿀 파일 목록"]
  disk --> photos
  photos --> group
  group --> uiNow
  photos --> uiNext
```

## 접근

새 IPC는 만들지 않습니다. `loadLibraryIndex`가 이미 전체 인덱스를 읽으므로, 뷰에 **사진 행 목록**만 같이 내려 파일 목록이 경로로 트리를 그리게 합니다. 그룹 병합(`mergeGroupsByMatchingTitle`)·지도·대시보드는 그대로 둡니다.

## 구현

### 1. 인덱스 뷰에 실제 경로 행 추가

[src/shared/types/preload.ts](src/shared/types/preload.ts)의 `LibraryIndexView`에 `photoRows`를 넣습니다. 형태는 기존 [src/presentation/renderer/view-models/flattenLibraryPhotos.ts](src/presentation/renderer/view-models/flattenLibraryPhotos.ts)의 `FlatPhotoRow`와 같게 (`photo` + `groupId` + `groupDisplayTitle`).

[src/presentation/common/mappers/toLibraryIndexView.ts](src/presentation/common/mappers/toLibraryIndexView.ts)에서 그룹별 `toGroupDetailView` 결과를 평탄화해 `photoRows`를 채웁니다. 폴더 경로는 `pickPathSegments`가 아니라 각 사진의 `outputRelativePath`입니다.

폴백 인덱스는 사진이 없으면 `photoRows: []`로 두고, 그때만 지금처럼 그룹 트리를 씁니다.

테스트: 한 그룹이 `2024/03/week1`과 `2024/05/week1`을 같이 가져도 `photoRows`에는 두 경로가 모두 남고, 그룹 `pathSegments`는 다수 폴더여도 파일 목록 데이터는 갈라집니다.

### 2. 파일 목록 훅을 경로 기준으로 전환

[src/presentation/renderer/pages/fileList/useFileListPathAndRows.ts](src/presentation/renderer/pages/fileList/useFileListPathAndRows.ts):

- `photoRows`가 있으면:
  - 트리: `buildOutputFolderTree(photoRows)`
  - 그리드: `filterRowsAtPath` — **그 폴더에 바로 있는 파일만** (년/월 폴더는 파일이 0장, 하위 `week1` 등에 파일이 있음. 디스크와 동일)
  - 장수: `countPhotosInSubtree` (5월 합계는 그룹 115가 아니라 실제 5월 파일 수)
  - 브레드크럼 옵션: `listSubfoldersAtPath(photoRows, …)`
- 그룹 상세 IPC는 그리드 표시에 더 이상 필요 없습니다. 이름 변경 미리보기는 이미 `rowsInFolder`의 `GroupPhotoSummary`로 가능합니다.
- `groupAtPath`는 이름 변경/이동 대상 그룹을 고를 때만, **현재 폴더 사진들의 `groupId`**로 찾습니다. 다수 경로와 현재 경로가 달라도 5월 week1에서 파일을 볼 수 있게 합니다.

### 3. 그리드·브레드크럼·이동 대상

- [src/presentation/renderer/pages/fileList/FileListPhotoGrid.tsx](src/presentation/renderer/pages/fileList/FileListPhotoGrid.tsx): `groupAtPath`가 없어도 그리드를 그립니다. “년·월·그룹까지 들어가면…” 문구를 없앱니다. 직접 파일이 없으면 “이 폴더에 바로 있는 파일은 없습니다” 정도로 바꿉니다.
- [src/presentation/renderer/pages/fileList/FileListBreadcrumbToolbar.tsx](src/presentation/renderer/pages/fileList/FileListBreadcrumbToolbar.tsx): 형제 폴더를 그룹 트리가 아니라 `listSubfoldersAtPath(photoRows)`로.
- [src/presentation/renderer/pages/fileList/useFileListMoveDestination.ts](src/presentation/renderer/pages/fileList/useFileListMoveDestination.ts): 이동 대상 폴더도 실제 하위 경로. `groupId`는 [src/presentation/renderer/view-models/outputPathNavigation.ts](src/presentation/renderer/view-models/outputPathNavigation.ts)의 `findFirstGroupIdUnderSubfolder` (행 기준).
- [src/presentation/renderer/pages/fileList/FileListGroupActionBar.tsx](src/presentation/renderer/pages/fileList/FileListGroupActionBar.tsx) / [src/presentation/renderer/pages/fileList/useFileListRenamePreview.ts](src/presentation/renderer/pages/fileList/useFileListRenamePreview.ts): 액션 바는 `groupAtPath` 대신 **현재 폴더에 사진이 있을 때** 보이게. `groupsInCurrentFolder`는 그 폴더 사진의 고유 `groupId`.

대시보드 폴더 표는 그룹 `pathSegments`를 그대로 둡니다.

## 작업 항목

1. `LibraryIndexView`에 `photoRows` 추가, `toLibraryIndexView`에서 실제 `outputRelativePath` 기준으로 평탄화, 테스트 추가
2. `useFileListPathAndRows`를 `buildOutputFolderTree` / `filterRowsAtPath` 기준으로 전환
3. 그리드·브레드크럼·이동 대상·액션 바를 경로 기준으로 맞추고 그룹 3단계 진입 안내 제거

## 기대 결과 (2024/05)

트리에 `daegu-jung-gu`, `daegu-seo-gu`, `new-york-city`, `week1`~`week5`가 모두 보입니다. `week1`을 열면 **5월 폴더에 있는 파일만** 나옵니다 (3월 week1과 섞이지 않음). 그룹을 week1로 합치는 저장 동작은 유지됩니다.
