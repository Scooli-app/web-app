// Paths under this segment (document ids, Clerk sub-steps) are not known at
// build time: each is rendered on its first request, then served from the cache.
// The page is a client component that loads its data in the browser, so the
// cached shell holds nothing user-specific.
export function generateStaticParams() {
  return [];
}

export default function StaticShellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
