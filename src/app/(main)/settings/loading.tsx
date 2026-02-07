export default function SettingsLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-48 mb-2" />
        <div className="h-6 bg-muted rounded-lg w-80" />
      </div>
      <div className="space-y-6">
        {/* Profile Card Skeleton */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="h-6 bg-muted rounded-lg w-40" />
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl mb-6">
            <div className="w-14 h-14 rounded-full bg-muted-foreground/20" />
            <div className="flex-1">
              <div className="h-5 bg-muted-foreground/20 rounded w-32 mb-2" />
              <div className="h-4 bg-muted-foreground/20 rounded w-48" />
            </div>
          </div>
          <div className="h-11 bg-muted rounded-xl w-36" />
        </div>

        {/* Subscription Card Skeleton */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="h-6 bg-muted rounded-lg w-52" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 bg-muted rounded-lg w-40" />
            <div className="h-6 bg-muted rounded-full w-16" />
          </div>
          <div className="h-4 bg-muted rounded w-52 mb-6" />
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
            <div className="h-3 bg-muted rounded-full w-full" />
          </div>
          <div className="h-11 bg-muted rounded-xl w-44" />
        </div>

        {/* Preferences Card Skeleton */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="h-6 bg-muted rounded-lg w-32" />
          </div>
          <div className="p-4 bg-muted rounded-xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-muted-foreground/20 rounded" />
                <div>
                  <div className="h-5 bg-muted-foreground/20 rounded w-16 mb-1" />
                  <div className="h-4 bg-muted-foreground/20 rounded w-24" />
                </div>
              </div>
              <div className="h-9 bg-muted-foreground/20 rounded-xl w-20" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-28" />
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-muted rounded mt-0.5" />
              <div>
                <div className="h-4 bg-muted rounded w-40 mb-1" />
                <div className="h-3 bg-muted rounded w-56" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-muted rounded mt-0.5" />
              <div>
                <div className="h-4 bg-muted rounded w-44 mb-1" />
                <div className="h-3 bg-muted rounded w-64" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
