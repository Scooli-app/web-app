const PROMO_ENDS_AT = process.env.NEXT_PUBLIC_PROMO_ENDS_AT;

export function isPromoActive(): boolean {
  if (!PROMO_ENDS_AT) {
    return false;
  }
  const endsAt = new Date(PROMO_ENDS_AT);
  return !Number.isNaN(endsAt.getTime()) && new Date() < endsAt;
}
