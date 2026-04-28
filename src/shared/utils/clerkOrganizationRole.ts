function normalizeClerkOrganizationRoleKey(
  role: string | null | undefined,
): string | null {
  if (!role) {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const lastColonIndex = normalized.lastIndexOf(":");
  if (lastColonIndex >= 0 && lastColonIndex < normalized.length - 1) {
    return normalized.slice(lastColonIndex + 1);
  }

  return normalized;
}

export function isClerkOrganizationAdminRole(
  role: string | null | undefined,
): boolean {
  const roleKey = normalizeClerkOrganizationRoleKey(role);
  return (
    roleKey === "admin" ||
    roleKey === "school_admin" ||
    roleKey === "director"
  );
}
