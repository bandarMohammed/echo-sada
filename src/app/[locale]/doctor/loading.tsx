/** Instant skeleton shown while the doctor area's server data resolves. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8" aria-hidden>
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
