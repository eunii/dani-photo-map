export function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Photo Organizer MVP
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Electron + React baseline is ready.
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Next steps will add source/output selection, scan orchestration, and
            map-driven results on top of this structure.
          </p>
          <div className="pt-4">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              UI scaffold
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}