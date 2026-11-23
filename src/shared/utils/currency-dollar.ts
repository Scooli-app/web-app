/**
 * The dollar sign of a currency symbol is text, not a maths delimiter.
 *
 * Brazilian prices always carry one ("R$ 80,00"). Read as `$…$`, it swallows the
 * sentence up to the next real formula ("… desconto de $10\%$") and renders it as
 * maths. Same rule as `MathMarkdownNormalizer.isCurrencyDollar` in the backend,
 * which keeps the stored text intact.
 */

/** True for the `$` at `i` when it belongs to "R$" or "US$" followed by an amount or a blank. */
export function isCurrencyDollar(text: string, i: number): boolean {
  if (text[i] !== "$") return false;
  let prefixStart: number;
  if (text[i - 1] === "R") {
    prefixStart = i - 1;
  } else if (text.slice(i - 2, i) === "US") {
    prefixStart = i - 2;
  } else {
    return isBareDollarAmount(text, i);
  }
  // Part of a longer word ("PR$") is not a currency.
  if (prefixStart > 0 && /[\p{L}\p{N}]/u.test(text[prefixStart - 1])) return false;
  let j = i + 1;
  if (text[j] === " ") j += 1;
  // An amount, or a blank for one ("R$ ___").
  return j < text.length && /[\d_]/.test(text[j]);
}

/**
 * "$5" with nothing on the line that could close it is a price, not maths. A closer is a "$" not
 * preceded by a space and not followed by a digit, so "$5 and $6" stays text while "$5$" is maths.
 * "$3 + 4?" is unclosed maths (the normalizer closes it). Same rule as the backend's isBareDollarAmount.
 */
function isBareDollarAmount(text: string, i: number): boolean {
  const amount = /^\d+(?:[.,]\d+)*\s*(.?)/.exec(text.slice(i + 1));
  if (!amount || /[-+*/=^\\×÷<>]/.test(amount[1])) return false;
  for (let j = i + 2; j < text.length && text[j] !== "\n"; j++) {
    if (text[j] === "$" && !/\s/.test(text[j - 1]) && !/\d/.test(text[j + 1] ?? "")) return false;
  }
  return true;
}

/** Index of the next `$` from `from` that is not a currency sign, or -1. */
export function nextMathDollar(text: string, from: number): number {
  let i = text.indexOf("$", from);
  while (i !== -1 && isCurrencyDollar(text, i)) i = text.indexOf("$", i + 1);
  return i;
}

/**
 * Stands in for a currency `$` while a `$…$` pattern runs. One character, so
 * indices in the masked text match the original.
 */
export const CURRENCY_DOLLAR_MASK = "";

/** `text` with every currency `$` replaced by {@link CURRENCY_DOLLAR_MASK}. */
export function maskCurrencyDollars(text: string): string {
  if (!text || !text.includes("$")) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += isCurrencyDollar(text, i) ? CURRENCY_DOLLAR_MASK : text[i];
  }
  return out;
}

/** Undoes {@link maskCurrencyDollars}. */
export function unmaskCurrencyDollars(text: string): string {
  return text && text.includes(CURRENCY_DOLLAR_MASK)
    ? text.split(CURRENCY_DOLLAR_MASK).join("$")
    : text;
}
