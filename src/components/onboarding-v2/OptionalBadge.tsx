/** Small "Optional" pill shown next to the labels of onboarding questions that can be skipped. */
export function OptionalBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
      {label}
    </span>
  );
}
