export default function DocumentsLoading() {
  return (
    <div className="w-full">
      <div className="flex flex-col space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        </div>

        {/* Filter skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-muted rounded-lg animate-pulse flex-shrink-0"
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-6 h-64 animate-pulse"
            >
              <div className="flex justify-between mb-4">
                <div className="h-6 w-24 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="h-6 w-3/4 bg-muted rounded mb-3" />
              <div className="space-y-2 mb-4">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </div>
              <div className="h-4 w-1/2 bg-muted rounded mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
