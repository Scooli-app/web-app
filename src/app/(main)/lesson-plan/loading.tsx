export default function LessonPlanLoading() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-6 w-96 bg-muted rounded animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-6">
          {/* Topic section */}
          <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="h-6 w-32 bg-muted rounded" />
            </div>
            <div className="h-12 w-full bg-muted rounded-lg" />
          </div>

          {/* Subject section */}
          <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
            <div className="h-12 w-full bg-muted rounded-lg" />
          </div>

          {/* Template section */}
          <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="h-6 w-40 bg-muted rounded" />
            </div>
            <div className="h-24 w-full bg-muted rounded-lg" />
          </div>

          {/* Grade & Duration row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="h-6 w-32 bg-muted rounded mb-4" />
              <div className="h-12 w-full bg-muted rounded-lg" />
            </div>
            <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="h-6 w-24 bg-muted rounded mb-4" />
              <div className="h-12 w-full bg-muted rounded-lg" />
            </div>
          </div>

          {/* Submit button */}
          <div className="h-14 w-full bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
