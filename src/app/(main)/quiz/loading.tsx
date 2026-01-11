export default function QuizLoading() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-6 w-80 bg-muted rounded animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="h-6 w-32 bg-muted rounded" />
              </div>
              <div className="h-12 w-full bg-muted rounded-lg" />
            </div>
          ))}
          <div className="h-14 w-full bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
