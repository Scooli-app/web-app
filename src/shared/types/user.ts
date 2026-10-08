export interface CurrentUserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  username: string;
  /** Portuguese NIF for invoicing. Empty string when not set. */
  nif: string;
  /**
   * UI language as a BCP-47 tag (`pt-PT` / `en`). `null` means the teacher has
   * not chosen one, so the interface follows the browser.
   *
   * Optional on the type, not just nullable: older backends do not return the
   * field at all, and "absent" has to read the same as "no preference" rather
   * than crashing the profile fetch.
   */
  preferredLocale?: string | null;
  /**
   * Language of AI-generated documents. `null` means "same as the interface" —
   * never "Portuguese". The two are independent: a Portuguese teacher of English
   * keeps a Portuguese interface and asks for English worksheets.
   */
  contentLanguage?: string | null;
  createdAt: string;
}
