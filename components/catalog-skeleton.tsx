export function CatalogSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12" aria-busy="true" aria-label="Loading products">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </section>
  );
}