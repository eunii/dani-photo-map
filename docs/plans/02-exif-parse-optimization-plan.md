# 02. EXIF 파싱 범위 최적화 계획

## 목표
- 메타데이터 읽기 비용을 줄여 스캔과 프리뷰 시간을 추가로 단축한다.
- MVP에 필요한 날짜/GPS 판정 품질은 유지한다.
- 포맷별 회귀를 최소화한 상태로 `exifr` 옵션을 축소한다.

## 현재 상태 요약
대상 파일:
- [`src/infrastructure/exif/ExifrPhotoMetadataReader.ts`](C:/workspace/cursor/Photo/src/infrastructure/exif/ExifrPhotoMetadataReader.ts)
- [`src/infrastructure/exif/ExifrPhotoMetadataReader.test.ts`](C:/workspace/cursor/Photo/src/infrastructure/exif/ExifrPhotoMetadataReader.test.ts)

현재 구현:
- `exifr.parse(sourcePath, { gps: true, tiff: true, exif: true, xmp: true, iptc: true })`
- 사용 필드:
  - 날짜: `DateTimeOriginal`, `CreateDate`, XMP/IPTC 추정 날짜, `ModifyDate`
  - 좌표: `latitude`, `longitude`
  - fallback: 파일 수정 시각 `stat.mtime`

## 실제 사용 필드 대응표

| 목적 | 현재 소스 | 유지 필요성 |
|---|---|---|
| 촬영 시각 1순위 | `DateTimeOriginal` | 높음 |
| 촬영 시각 2순위 | `CreateDate` | 높음 |
| 촬영 시각 3순위 | XMP/IPTC 파생 날짜 | 중간 |
| 촬영 시각 4순위 | `ModifyDate` | 중간 |
| GPS | `latitude`, `longitude` | 높음 |
| 파일 fallback | `stat.mtime` | 높음 |

핵심 해석:
- MVP 기준 필수는 `EXIF 기본 날짜 + GPS` 다.
- XMP/IPTC 는 일부 파일 복구용 가치가 있지만 비용 대비 효과를 검증해야 한다.

## 제안 구현

### 1. 현재 옵션을 단계적으로 축소
1차 축소안:
- `gps: true`
- `exif: true`
- `tiff: true`
- `xmp: false`
- `iptc: false`

대안:
- `xmp`, `iptc` 를 기본 비활성화하되, 필요한 경우에만 보조 시도

### 2. 이중 단계 파싱 전략 검토
권장 방향:
1. 빠른 기본 파싱: EXIF/TIFF/GPS 만 읽기
2. 날짜가 비어 있을 때만 XMP/IPTC 보조 파싱

장점:
- 정상적인 사진 대부분에서 빠르게 종료
- 특수 파일은 일부 복구 품질 유지

단점:
- 구현이 약간 복잡해짐
- 테스트 케이스가 늘어남

MVP 후속 개선 기준 권장안:
- 먼저 `xmp`, `iptc` 를 끄는 단순안으로 시작
- 회귀가 있으면 조건부 보조 파싱을 도입

## 세부 작업
1. `ExifrPhotoMetadataReader` 에서 실제 읽는 필드와 fallback 흐름을 문서화
2. `xmp`, `iptc` 제거 후 테스트 정비
3. `pickDateFromEmbeddedSidecar()` 사용 경로가 여전히 필요한지 검증
4. 필요 시 `capturedAt-missing` 샘플만 재파싱하는 조건부 보조 단계 추가

## 영향 범위

### 직접 영향
- [`src/infrastructure/exif/ExifrPhotoMetadataReader.ts`](C:/workspace/cursor/Photo/src/infrastructure/exif/ExifrPhotoMetadataReader.ts)
- [`src/application/usecases/ScanPhotoLibraryUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/ScanPhotoLibraryUseCase.ts)
- [`src/application/usecases/PreviewPendingOrganizationUseCase.ts`](C:/workspace/cursor/Photo/src/application/usecases/PreviewPendingOrganizationUseCase.ts)

### 간접 영향
- 그룹핑 시점의 `capturedAt`
- 지도 정렬과 대표 그룹 표시명
- GPS 누락 분류

## 테스트 계획

### 자동 테스트
유지/보강 대상:
- [`src/infrastructure/exif/ExifrPhotoMetadataReader.test.ts`](C:/workspace/cursor/Photo/src/infrastructure/exif/ExifrPhotoMetadataReader.test.ts)

추가할 테스트:
- `DateTimeOriginal` 우선 사용
- `CreateDate` fallback
- `ModifyDate` fallback
- GPS 없음 / invalid GPS 분기
- 파일 수정 시각 fallback
- XMP/IPTC 없이도 일반 JPEG/HEIC 가 정상 처리되는지

### 수동 검증
1. iPhone 사진
2. Android 사진
3. HEIC 사진
4. PNG 또는 스크린샷
5. 메타데이터가 비어 있는 파일

확인 항목:
- 날짜가 기존보다 많이 비지 않는지
- GPS 판정이 유지되는지
- `missingGpsCategory` 분류가 급격히 달라지지 않는지

## 성능 측정 기준
- 동일 샘플 폴더에서 `PreviewPendingOrganizationUseCase` 실행 시간 비교
- 동일 샘플 폴더에서 `ScanPhotoLibraryUseCase` 준비 단계 시간 비교
- 회귀가 없다면 총 시간 감소를 우선 채택

## 성공 기준
- 일반적인 카메라 사진에서 날짜/GPS 추출 결과가 기존과 동일하다.
- 메타데이터 읽기 시간이 줄어든다.
- `captured-at-missing`, `gps-missing` 비율이 비정상적으로 증가하지 않는다.

## 리스크와 대응
- 리스크: 일부 앱이 XMP/IPTC 에만 날짜를 저장
  - 대응: 조건부 보조 파싱 fallback 준비
- 리스크: 테스트 샘플이 부족해 회귀를 놓칠 수 있음
  - 대응: 실제 사용자 샘플 폴더 1~2개로 수동 비교
- 리스크: 성능 개선이 미미할 수 있음
  - 대응: 1단계 병렬화와 함께 측정해 누적 효과로 판단

## 후속 단계와 연결
- 1단계 병렬화 이후 이 단계를 적용하면 병렬 worker 당 작업 시간이 더 짧아진다.
- 5단계 리팩터링 때는 EXIF 전략을 별도 메타데이터 정책 또는 옵션 객체로 분리할 수 있다.
