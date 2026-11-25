import { countryFromGeoHeaders } from "@/lib/geo/countryFromHeaders";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Pre-fill for the country selector: the visitor's country from the edge geo
 * headers, "PT" when unknown. The client may still change it before confirming.
 */
export async function GET() {
  const countryCode = countryFromGeoHeaders(await headers());
  return NextResponse.json({ countryCode });
}
