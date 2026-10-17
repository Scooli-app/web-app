/**
 * Repairs the maths the model writes into markdown documents (quizzes, worksheets, tests,
 * lesson plans). The editor and the PDF/DOCX exports only render LaTeX between `$...$` and
 * `$$...$$`, and KaTeX rejects a whole span on its first syntax error, so a single bad
 * character shows the student raw LaTeX instead of a fraction.
 *
 * Repairs, per line, in this order:
 * 1. A closing `$` the model wrote as a lone backslash or as `\$`: `$\frac{1}{2}\?`,
 *    `$\frac{2}{4}\` at the end of a line, `$\frac{5}{5}\ é igual a 1.` Left alone, the next `$`
 *    on the line pairs with the opener and the prose in between is set as maths.
 * 2. Prose inside a maths span is moved out of it: `$\frac{2}{3} é maior que \frac{3}{4}$`
 *    becomes `$\frac{2}{3}$ é maior que $\frac{3}{4}$`.
 * 3. LaTeX written without delimiters (`\frac{1}{2} = \frac{___}{4}`) is wrapped in `$...$`.
 * 4. Fill-in blanks inside maths (`___`, `\_\_`) become `\square`. An underscore is LaTeX's
 *    subscript operator, so KaTeX cannot render a blank made of them.
 *
 * Well-formed maths comes back unchanged, and the repair is idempotent.
 *
 * Port of the backend's `MathMarkdownNormalizer` (chalkboard, services/ai), which repairs new
 * generations before they are saved. This copy runs at render time so documents saved before that
 * repair existed render correctly too. Keep the two in step.
 */

/** Commands that wrap their argument in text mode: their contents are never prose to move out. */
const TEXT_COMMANDS = new Set([
  "text", "textrm", "textit", "textbf", "textnormal", "mbox",
  "mathrm", "mathit", "mathbf", "mathsf", "operatorname",
]);

/** Commands that only make sense in maths, so finding one in running text means the delimiters are missing. */
const MATH_COMMANDS = new Set([
  "frac", "dfrac", "tfrac", "sqrt", "times", "div", "cdot", "pm", "mp",
  "leq", "geq", "le", "ge", "neq", "ne", "approx", "square", "Box", "infty",
  "circ", "cdots", "ldots", "overline", "angle", "triangle",
  "rightarrow", "Rightarrow", "Leftrightarrow",
  "alpha", "beta", "gamma", "delta", "Delta", "theta", "lambda", "mu", "pi", "sigma", "omega",
]);

/** Function words that never appear in school maths as variable names. Compared lower-cased. */
const PROSE_WORDS = new Set([
  // Portuguese
  "que", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas", "um", "uma", "uns", "umas",
  "ou", "se", "com", "por", "para", "pelo", "pela", "ao", "aos", "os", "as", "maior", "menor",
  "igual", "mais", "menos", "qual", "quanto", "quantos", "quantas", "entre", "tem", "fica", "parte", "partes",
  // English
  "is", "are", "the", "and", "or", "than", "of", "to", "greater", "less", "equal", "equals",
  "what", "which", "true", "false", "each", "from",
]);

/** Single letters that are prose only with a space on both sides ("2/3 e 3/4"); otherwise variables. */
const SPACED_PROSE_LETTERS = new Set(["e"]);

const MATH_COMMAND_START = /\\([A-Za-z]+)/g;
const ESCAPED_UNDERSCORE_BLANK = /\\_(?:\s*\\_)*/g;
const UNDERSCORE_BLANK = /_{2,}/g;
const DANGLING_UNDERSCORE = /_(?=\s*(?:\}|$))/g;
const REPEATED_SQUARE = /\\square(?:\s*\\square)+(?![A-Za-z])/g;
const SENTENCE_PUNCTUATION = ",.;:?!";

type SegmentType = "text" | "inline" | "display";

interface Segment {
  type: SegmentType;
  text: string;
  closed: boolean;
}

interface MathSpan {
  content: string;
  end: number;
}

type TokenKind = "command" | "escape" | "group" | "word" | "space" | "symbol";

interface Token {
  kind: TokenKind;
  text: string;
}

const textSegment = (text: string): Segment => ({ type: "text", text, closed: true });
const inlineSegment = (text: string): Segment => ({ type: "inline", text, closed: true });

/** Repairs every line. Returns the input unchanged when there is nothing to do. */
export function normalizeMathMarkdown(content: string): string {
  if (!content || (!content.includes("$") && !content.includes("\\"))) {
    return content;
  }
  const out: string[] = [];
  let inFence = false;
  let inDisplayMath = false;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      out.push(line);
    } else if (inFence || line.includes("`")) {
      out.push(line);
    } else if (inDisplayMath) {
      const close = line.indexOf("$$");
      if (close < 0) {
        out.push(fixBlanks(line));
      } else {
        inDisplayMath = false;
        out.push(fixBlanks(line.slice(0, close)) + line.slice(close));
      }
    } else {
      const displayOpened = { value: false };
      out.push(normalizeLine(line, displayOpened));
      inDisplayMath = displayOpened.value;
    }
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Line pipeline
// ---------------------------------------------------------------------------

function normalizeLine(line: string, displayOpened: { value: boolean }): string {
  if (!line.includes("$") && !line.includes("\\")) {
    return line;
  }
  const segments: Segment[] = [];
  for (const segment of scan(line, displayOpened)) {
    if (segment.type === "text") segments.push(...wrapBareLatex(segment.text));
    else if (segment.type === "inline") segments.push(...splitProse(segment.text));
    else segments.push(segment);
  }
  return segments
    .map((segment) => {
      if (segment.type === "text") return segment.text;
      if (segment.type === "inline") return `$${fixBlanks(segment.text)}$`;
      return `$$${fixBlanks(segment.text)}${segment.closed ? "$$" : ""}`;
    })
    .join("");
}

/** Splits a line into text and maths, repairing mangled or missing closing delimiters. */
function scan(line: string, displayOpened: { value: boolean }): Segment[] {
  const segments: Segment[] = [];
  let text = "";
  const flushText = () => {
    if (text) {
      segments.push(textSegment(text));
      text = "";
    }
  };
  const n = line.length;
  let i = 0;
  while (i < n) {
    const c = line[i];
    if (c === "\\" && line[i + 1] === "$") {
      text += "\\$"; // an escaped dollar in running text is a literal dollar sign
      i += 2;
      continue;
    }
    if (c !== "$") {
      text += c;
      i++;
      continue;
    }
    if (line[i + 1] === "$") {
      flushText();
      const close = line.indexOf("$$", i + 2);
      if (close < 0) {
        segments.push({ type: "display", text: line.slice(i + 2), closed: false });
        displayOpened.value = true;
        return segments;
      }
      segments.push({ type: "display", text: line.slice(i + 2, close), closed: true });
      i = close + 2;
      continue;
    }
    const span = readInlineMath(line, i + 1);
    if (span.content.trim() === "") {
      text += "$"; // a lone dollar sign with no maths after it: leave it as text
      i++;
      continue;
    }
    flushText();
    segments.push(inlineSegment(span.content));
    i = span.end;
  }
  flushText();
  return segments;
}

/**
 * Reads an inline maths span that starts at `start` (just after its opening `$`) and finds where
 * it really ends, which is not always at the next `$`.
 */
function readInlineMath(line: string, start: number): MathSpan {
  const n = line.length;
  let depth = 0;
  let j = start;
  while (j < n) {
    const c = line[j];
    if (c === "$") {
      return { content: line.slice(start, j), end: j + 1 };
    }
    if (c === "{") depth++;
    else if (c === "}") depth = Math.max(0, depth - 1);
    if (c !== "\\") {
      j++;
      continue;
    }
    if (j + 1 >= n) {
      return { content: line.slice(start, j), end: n }; // "\" at the end of the line stood in for "$"
    }
    const next = line[j + 1];
    if (next === "$") {
      return { content: line.slice(start, j), end: j + 2 }; // "\$" used as the closer
    }
    if (isAsciiLetter(next)) {
      j += 2;
      while (j < n && isAsciiLetter(line[j])) j++;
      continue;
    }
    if (depth === 0 && (next === "?" || next === ".")) {
      // Neither is a maths command, so the backslash was the closer; keep the punctuation.
      return { content: line.slice(start, j), end: j + 1 };
    }
    if (depth === 0 && " \t,;:!\\".includes(next)) {
      // Valid LaTeX spacing (or a line break), unless prose follows it before the next "$",
      // or nothing does and the span is never closed.
      const nextDollar = line.indexOf("$", j + 2);
      const rest = line.slice(j + 2, nextDollar < 0 ? n : nextDollar);
      if (containsProse(rest) || (nextDollar < 0 && rest.trim() === "")) {
        return { content: line.slice(start, j), end: next === "\\" ? j + 2 : j + 1 };
      }
    }
    j += 2;
  }
  return closeUnterminated(line, start);
}

/** No closer on the line: end the maths before the first prose word, or before trailing punctuation. */
function closeUnterminated(line: string, start: number): MathSpan {
  const content = line.slice(start);
  const tokens = tokenize(content);
  const prose = proseMask(tokens);
  let cut = content.length;
  let offset = 0;
  for (let t = 0; t < tokens.length; t++) {
    if (prose[t]) {
      cut = offset;
      break;
    }
    offset += tokens[t].text.length;
  }
  while (cut > 0 && " \t?.!,;:".includes(content[cut - 1])) cut--;
  return { content: content.slice(0, cut), end: start + cut };
}

/** Moves prose out of a maths span, leaving the maths around it in their own spans. */
function splitProse(math: string): Segment[] {
  const tokens = tokenize(math);
  const prose = proseMask(tokens);
  if (!prose.some(Boolean)) {
    return [inlineSegment(math)];
  }

  // Spaces and sentence punctuation next to prose belong to the prose.
  const isText = tokens.map(
    (token, t) =>
      prose[t] ||
      (isNeutral(token) &&
        (nearestNonNeutralIsProse(tokens, prose, t, -1) ||
          nearestNonNeutralIsProse(tokens, prose, t, 1))),
  );

  const segments: Segment[] = [];
  let run = "";
  let runIsText = isText[0];
  tokens.forEach((token, t) => {
    if (isText[t] !== runIsText) {
      addRun(segments, run, runIsText);
      run = "";
      runIsText = isText[t];
    }
    run += token.text;
  });
  addRun(segments, run, runIsText);
  return segments;
}

function addRun(segments: Segment[], run: string, isText: boolean): void {
  if (!run) return;
  const onlyPunctuation = [...run].every(
    (ch) => /\s/.test(ch) || SENTENCE_PUNCTUATION.includes(ch),
  );
  if (isText || onlyPunctuation) {
    const last = segments[segments.length - 1];
    if (last?.type === "text") {
      segments[segments.length - 1] = textSegment(last.text + run);
    } else {
      segments.push(textSegment(run));
    }
  } else {
    segments.push(inlineSegment(run));
  }
}

function isNeutral(token: Token): boolean {
  return (
    token.kind === "space" ||
    (token.kind === "symbol" && SENTENCE_PUNCTUATION.includes(token.text))
  );
}

function nearestNonNeutralIsProse(
  tokens: Token[],
  prose: boolean[],
  from: number,
  step: number,
): boolean {
  for (let t = from + step; t >= 0 && t < tokens.length; t += step) {
    if (!isNeutral(tokens[t])) return prose[t];
  }
  return false;
}

/** Wraps maths-only LaTeX commands found in running text, with the expression around them, in `$...$`. */
function wrapBareLatex(text: string): Segment[] {
  if (!text.includes("\\")) {
    return [textSegment(text)];
  }
  const segments: Segment[] = [];
  const matcher = new RegExp(MATH_COMMAND_START.source, "g");
  let from = 0;
  let searchFrom = 0;
  while (searchFrom < text.length) {
    matcher.lastIndex = searchFrom;
    const match = matcher.exec(text);
    if (!match) break;
    const command = match.index;
    const escaped = command > 0 && text[command - 1] === "\\";
    if (escaped || !MATH_COMMANDS.has(match[1])) {
      searchFrom = command + match[0].length;
      continue;
    }
    let start = expandLeft(text, command, from);
    const end = expandRight(text, command);
    // An opening bracket whose closer stayed in the prose ("(\frac{1}{2} da pizza)") stays out too.
    while (text[start] === "(" && unbalanced(text.slice(start, end), "(", ")") > 0) {
      start++;
      while (start < command && /\s/.test(text[start])) start++;
    }
    if (start > from) segments.push(textSegment(text.slice(from, start)));
    segments.push(inlineSegment(text.slice(start, end)));
    from = end;
    searchFrom = end;
  }
  if (from < text.length) segments.push(textSegment(text.slice(from)));
  return segments;
}

function expandLeft(text: string, command: number, floor: number): number {
  let a = command;
  while (a > floor) {
    const c = text[a - 1];
    const decimalPoint =
      (c === "." || c === ",") &&
      a - 2 >= floor &&
      isDigit(text[a - 2]) &&
      isDigit(text[a]);
    if (isDigit(c) || c === " " || "+-=<>(×÷·±≤≥≠≈".includes(c) || decimalPoint) {
      a--;
    } else {
      break;
    }
  }
  while (a < command && /\s/.test(text[a])) a++;
  // "- \frac..." at the start of the text is a list bullet, not a minus sign.
  if (
    a + 1 < command &&
    (text[a] === "-" || text[a] === "+") &&
    /\s/.test(text[a + 1]) &&
    text.slice(floor, a).trim() === ""
  ) {
    a += 2;
    while (a < command && /\s/.test(text[a])) a++;
  }
  return a;
}

function expandRight(text: string, command: number): number {
  const tokens = tokenize(text.slice(command));
  let length = 0;
  let accepted = 0;
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    let ok: boolean;
    switch (token.kind) {
      case "command":
      case "group":
      case "space":
        ok = true;
        break;
      case "escape":
        ok = token.text.length === 2 && "_,;! ".includes(token.text[1]);
        break;
      case "word":
        ok = token.text.length === 1 && !isProseWord(token.text, spacedAt(tokens, t));
        break;
      default:
        ok = isMathSymbol(tokens, t);
    }
    if (!ok) break;
    length += token.text.length;
    if (token.kind !== "space") accepted = length;
  }
  let run = text.slice(command, command + accepted);
  // Never swallow the opening bracket of a parenthetical that continues in prose: "\frac{1}{2} (metade)".
  while (unbalanced(run, "(", ")") > 0 && run.lastIndexOf("(") >= 0) {
    run = run.slice(0, run.lastIndexOf("(")).trimEnd();
  }
  return command + run.length;
}

function isMathSymbol(tokens: Token[], t: number): boolean {
  const s = tokens[t].text;
  if ("0123456789+-=<>()[]^_/'×÷·±≤≥≠≈%".includes(s)) {
    return true;
  }
  if (s === "." || s === ",") {
    return (
      t > 0 &&
      t + 1 < tokens.length &&
      isDigit(tokens[t - 1].text.slice(-1)) &&
      isDigit(tokens[t + 1].text[0])
    );
  }
  return false;
}

/** Replaces fill-in blanks written with underscores by `\square`, which KaTeX can render. */
function fixBlanks(math: string): string {
  if (!math.includes("_")) return math;
  return math
    .replace(ESCAPED_UNDERSCORE_BLANK, "\\square")
    .replace(UNDERSCORE_BLANK, "\\square")
    .replace(DANGLING_UNDERSCORE, "\\square")
    .replace(REPEATED_SQUARE, "\\square");
}

// ---------------------------------------------------------------------------
// Tokens and prose detection
// ---------------------------------------------------------------------------

/**
 * Splits LaTeX into top-level tokens. A brace group is one token, so anything inside one
 * (a numerator, a `\text{...}` argument) is never mistaken for prose at the top level.
 */
function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  const n = s.length;
  let i = 0;
  while (i < n) {
    const c = s[i];
    let end: number;
    let kind: TokenKind;
    if (c === "\\" && i + 1 < n && isAsciiLetter(s[i + 1])) {
      end = i + 1;
      while (end < n && isAsciiLetter(s[end])) end++;
      if (TEXT_COMMANDS.has(s.slice(i + 1, end))) {
        let group = end;
        while (group < n && s[group] === " ") group++;
        if (s[group] === "{") end = groupEnd(s, group);
      }
      kind = "command";
    } else if (c === "\\") {
      end = Math.min(i + 2, n);
      kind = "escape";
    } else if (c === "{") {
      end = groupEnd(s, i);
      kind = "group";
    } else if (isLatinLetter(c)) {
      end = i + 1;
      while (end < n && isLatinLetter(s[end])) end++;
      kind = "word";
    } else if (/\s/.test(c)) {
      end = i + 1;
      while (end < n && /\s/.test(s[end])) end++;
      kind = "space";
    } else {
      end = i + 1;
      kind = "symbol";
    }
    tokens.push({ kind, text: s.slice(i, end) });
    i = end;
  }
  return tokens;
}

/** Index just past the brace closing the group that opens at `open`, or the end of the string. */
function groupEnd(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      i++;
    } else if (c === "{") {
      depth++;
    } else if (c === "}" && --depth === 0) {
      return i + 1;
    }
  }
  return s.length;
}

function proseMask(tokens: Token[]): boolean[] {
  const prose = tokens.map(
    (token, t) => token.kind === "word" && isProseWord(token.text, spacedAt(tokens, t)),
  );
  // A short lower-case word right after prose ("é igual a 2") is an article or preposition.
  for (let t = 2; t < tokens.length; t++) {
    const token = tokens[t];
    if (
      !prose[t] &&
      token.kind === "word" &&
      token.text.length <= 2 &&
      token.text === token.text.toLowerCase() &&
      tokens[t - 1].kind === "space" &&
      prose[t - 2] &&
      tokens[t + 1]?.kind === "space"
    ) {
      prose[t] = true;
    }
  }
  return prose;
}

function containsProse(s: string): boolean {
  return proseMask(tokenize(s)).some(Boolean);
}

function spacedAt(tokens: Token[], t: number): boolean {
  return tokens[t - 1]?.kind === "space" && tokens[t + 1]?.kind === "space";
}

/**
 * Whether a word inside maths is prose. Deliberately conservative: school maths uses short ASCII
 * names (x, ab, sen, cm, ABCD), so only accented words, known function words and longer
 * lower-case words count.
 */
function isProseWord(word: string, spacedBothSides: boolean): boolean {
  if ([...word].some((ch) => ch.charCodeAt(0) > 0x7f)) {
    return true;
  }
  const lower = word.toLowerCase();
  if (word.length === 1) {
    return spacedBothSides && SPACED_PROSE_LETTERS.has(lower);
  }
  if (PROSE_WORDS.has(lower)) {
    return true;
  }
  return word.length >= 5 && word !== word.toUpperCase();
}

// ---------------------------------------------------------------------------
// Character helpers
// ---------------------------------------------------------------------------

function isAsciiLetter(c: string | undefined): boolean {
  return c !== undefined && /^[A-Za-z]$/.test(c);
}

/** ASCII letters and accented Latin letters (Portuguese prose), but not Greek or other symbols. */
function isLatinLetter(c: string): boolean {
  if (isAsciiLetter(c)) return true;
  const code = c.charCodeAt(0);
  return code >= 0xc0 && code <= 0x24f && /\p{L}/u.test(c);
}

function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= "0" && c <= "9" && c.length === 1;
}

/** How many more `open` than `close` characters the string has. */
function unbalanced(s: string, open: string, close: string): number {
  let balance = 0;
  for (const ch of s) {
    if (ch === open) balance++;
    else if (ch === close) balance--;
  }
  return balance;
}
