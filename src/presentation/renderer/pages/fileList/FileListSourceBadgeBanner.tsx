interface FileListSourceBadgeBannerProps {
  label: string
  tone: string
  description: string
}

export function FileListSourceBadgeBanner({
  label,
  tone,
  description
}: FileListSourceBadgeBannerProps) {
  return (
    <section className={`shrink-0 rounded-xl border px-2 py-1.5 text-xs ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-current/20 bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
          {label}
        </span>
        <p>{description}</p>
      </div>
    </section>
  )
}
