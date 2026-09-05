export interface CurrentUserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  username: string;
  /** Portuguese NIF for invoicing. Empty string when not set. */
  nif: string;
  createdAt: string;
}
