export function CatalogSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12" aria-busy="true" aria-label="Loading products">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </section>
  );
}