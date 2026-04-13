interface BrowsePageBannersProps {
  errorMessage?: string | null
  groupDetailErrorMessage?: string | null
  successMessage?: string | null
}

export function BrowsePageBanners({
  errorMessage,
  groupDetailErrorMessage,
  successMessage
}: BrowsePageBannersProps) {
  return (
    <>
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {groupDetailErrorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {groupDetailErrorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
    </>
  )
}
