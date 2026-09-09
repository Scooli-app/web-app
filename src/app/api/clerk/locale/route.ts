import { isSupportedLocale } from "@/i18n/locales";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Writes the caller's locale into their Clerk `public_metadata.locale`.
 *
 * This is the only path by which the language of Clerk's transactional mail gets
 * decided: the backend's Clerk webhook reads `public_metadata.locale` when it
 * sends verification codes, magic links and organization invitations. With the
 * field unset, every one of those emails is Portuguese forever, whatever the
 * teacher picked in the app.
 *
 * `publicMetadata` is deliberately not writable from the browser — that is the
 * point of it — so the update has to happen here, with the secret key, on behalf
 * of the already-authenticated caller. The caller cannot name a different user:
 * the id comes from the session, never from the request body.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let locale: unknown;
  try {
    const body = (await request.json()) as { locale?: unknown };
    locale = body?.locale;
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!isSupportedLocale(locale)) {
    return NextResponse.json(
      { error: "Unsupported locale" },
      { status: 400 },
    );
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user.publicMetadata?.locale === locale) {
      return NextResponse.json({ locale, updated: false });
    }

    // Spread the existing metadata rather than replacing it: `role: "admin"` also
    // lives in public_metadata and is read by the middleware on every request.
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { ...user.publicMetadata, locale },
    });

    return NextResponse.json({ locale, updated: true });
  } catch (error) {
    console.error("[clerk-locale] Failed to stamp locale", error);
    return NextResponse.json(
      { error: "Failed to update locale" },
      { status: 502 },
    );
  }
}
