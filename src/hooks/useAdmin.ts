import { useUser } from "@clerk/nextjs";

/**
 * Hook to check if the current user has the admin role.
 * 
 * @returns An object containing `isAdmin` flag and Clerk's `isLoaded` status.
 */
export function useAdmin() {
  const { user, isLoaded } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return { isAdmin, isLoaded };
}
