import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  title?: string
}

function BaseIcon({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** 사이드바: 사진 정리하기 — 겹친 사진 프레임(뒤·앞) + 앞쪽에 풍경·텍스트 줄 */
export function OrganizeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 6.5h8.5a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 14.5V8A1.5 1.5 0 0 1 4.5 6.5Z" />
      <path d="M11.5 9.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 10 18v-7a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M13 12.5h5" />
      <path d="M13 15.5h3.5" />
      <circle cx="7.5" cy="10" r="1.2" />
      <path d="m5 14.5 2.5-2 2 1.5 2.5-2" />
    </BaseIcon>
  )
}

/** 사이드바: 파일 목록 조회 — 목록 + 돋보기 */
export function FilesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h10" />
      <path d="M4 11h8" />
      <path d="M4 15h9" />
      <path d="M4 19h6" />
      <circle cx="17" cy="15.5" r="3.5" />
      <path d="m19.5 18 2.5 2.5" />
    </BaseIcon>
  )
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </BaseIcon>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18 3.5 20.5V6L9 3.5l6 2.5L20.5 3v14.5L15 20l-6-2Z" />
      <path d="M9 3.5V18" />
      <path d="M15 6v14" />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-3.6 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1 0-3.6h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 0 1 3.6 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.8 1.8 0 0 1 0 3.6h-.2a1 1 0 0 0-.9.6Z" />
    </BaseIcon>
  )
}

export function SidebarCollapseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5.5v13" />
      <path d="m14.5 9-3 3 3 3" />
    </BaseIcon>
  )
}

export function SidebarExpandIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5.5v13" />
      <path d="m11.5 9 3 3-3 3" />
    </BaseIcon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </BaseIcon>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="m18.5 14 0.8 2.2 2.2 0.8-2.2 0.8-0.8 2.2-0.8-2.2-2.2-0.8 2.2-0.8 0.8-2.2Z" />
      <path d="M5 14.5 5.7 16 7.2 16.7 5.7 17.4 5 19l-.7-1.6L2.8 16.7 4.3 16 5 14.5Z" />
    </BaseIcon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </BaseIcon>
  )
}

/** 파일 목록 트리: 접힌 폴더 */
export function FolderClosedIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7.5h5l1.5 2H19a1 1 0 0 1 1 1V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5a1 1 0 0 1 1-1Z" />
    </BaseIcon>
  )
}

/** 파일 목록 트리: 펼친 폴더 */
export function FolderOpenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9h5l1.5 2H19a1.5 1.5 0 0 1 1.4 1l1.6 5.5a2 2 0 0 1-1.9 2.5H6a2 2 0 0 1-2-2V10a1 1 0 0 1 1-1Z" />
      <path d="M4 10 6.5 18.5H18" />
    </BaseIcon>
  )
}

/** 출력 폴더 트리 루트(전체 보기) */
export function LibraryRootIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5" />
      <path d="M4 10.5 12 6h5l2 2h7v2.5" />
      <path d="M12 6V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2" />
    </BaseIcon>
  )
}

/** KPI: 그룹 수 */
export function KpiGroupsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6.5h5a2 2 0 0 1 2 2V17H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" />
      <path d="M13 8.5h5a2 2 0 0 1 2 2V17h-7v-8.5Z" />
    </BaseIcon>
  )
}

/** KPI: 사진 수 */
export function KpiPhotosIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 16 5-5 4 4 3-3 4 4" />
    </BaseIcon>
  )
}

/** KPI: 위치 미확인 */
export function KpiLocationUnknownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <path d="M9 9h6" />
      <path d="M12 12v4" />
    </BaseIcon>
  )
}

/** KPI: 마지막 갱신 */
export function KpiClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </BaseIcon>
  )
}
