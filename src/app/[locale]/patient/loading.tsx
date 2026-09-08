/** Instant skeleton shown the moment the user navigates into the patient area,
 * while the dashboard's server data resolves. Gives immediate visible feedback. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8" aria-hidden>
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
