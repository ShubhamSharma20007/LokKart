export function ProductSkeleton() {
  return (
    <div className="grid gap-6 sm:gap-8 md:grid-cols-[400px_1fr] lg:grid-cols-[440px_1fr] lg:gap-12 items-start">
      {/* Left Column: Image Gallery Skeleton matching exact ProductGallery layout */}
      <div className="space-y-3 mx-auto w-full max-w-[420px]">
        {/* Main image container: aspect-square, max-h 440px, matching ProductGallery border & radius */}
        <div className="aspect-square w-full max-h-[440px] min-h-[280px] sm:min-h-[360px] animate-pulse rounded-2xl border border-border/60 bg-muted/70 shadow-xs" />

        {/* Thumbnail row placeholder */}
        <div className="flex items-center gap-3 overflow-hidden pt-1">
          <div className="size-14 sm:size-16 shrink-0 animate-pulse rounded-lg border border-border/40 bg-muted/60" />
          <div className="size-14 sm:size-16 shrink-0 animate-pulse rounded-lg border border-border/40 bg-muted/60" />
          <div className="size-14 sm:size-16 shrink-0 animate-pulse rounded-lg border border-border/40 bg-muted/60" />
        </div>
      </div>

      {/* Right Column: Details & Purchase Card Skeleton */}
      <div className="space-y-5 w-full">
        {/* Category & Title */}
        <div className="space-y-2.5">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted/70" />
          <div className="h-7 sm:h-8 w-4/5 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/50" />
        </div>

        {/* Purchase Card Skeleton */}
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
          {/* Price header */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 animate-pulse rounded-lg bg-muted/80" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted/50" />
            <div className="ml-auto h-5 w-20 animate-pulse rounded-md bg-muted/60" />
          </div>

          {/* Stock Badge */}
          <div className="h-5 w-24 animate-pulse rounded-full bg-muted/60" />

          {/* Color Selector */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full animate-pulse bg-muted/70" />
              <div className="size-8 rounded-full animate-pulse bg-muted/70" />
              <div className="size-8 rounded-full animate-pulse bg-muted/70" />
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-11 rounded-lg animate-pulse bg-muted/60" />
              <div className="h-8 w-11 rounded-lg animate-pulse bg-muted/60" />
              <div className="h-8 w-11 rounded-lg animate-pulse bg-muted/60" />
              <div className="h-8 w-11 rounded-lg animate-pulse bg-muted/60" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border/50">
            <div className="h-11 rounded-xl animate-pulse bg-muted/80" />
            <div className="h-11 rounded-xl animate-pulse bg-muted/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

