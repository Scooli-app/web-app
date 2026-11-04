import type { Teacher } from "@/shared/types/school-direction";

/** The teacher as the contact of a class: name, and the email as a mailto link. The backend uses the email as the name when there is none, so it is shown once. */
export function TeacherContact({ teacher }: { teacher: Teacher }) {
  const { name, email } = teacher;
  if (!name && !email) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2">
      {name && name !== email && <span className="font-medium text-foreground">{name}</span>}
      {email && (
        <a href={`mailto:${email}`} className="truncate text-primary hover:underline">
          {email}
        </a>
      )}
    </span>
  );
}
