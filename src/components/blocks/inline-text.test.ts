import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineText } from "./inline-text";

const render = (value: string) => renderToStaticMarkup(createElement(InlineText, { value }));

describe("InlineText maths limits", () => {
  it("caps \\rule sizes at 10em", () => {
    const html = render("$\\rule{50em}{1em}$");
    expect(html).toContain("border-right-width:10em");
    expect(html).not.toContain("width:50em");
  });

  it("stops a formula after 100 macro expansions, rendering the error instead", () => {
    expect(render(`$\\def\\a{x}${"\\a".repeat(50)}$`)).not.toContain("katex-error");
    expect(render(`$\\def\\a{x}${"\\a".repeat(150)}$`)).toContain("katex-error");
  });
});

describe("InlineText currency", () => {
  it("keeps Brazilian prices as text, not one formula between two R$", () => {
    expect(render("custa R$ 3,75 e R$ 2,40")).toBe("custa R$ 3,75 e R$ 2,40");
  });

  it("keeps US dollar prices as text", () => {
    expect(render("A pen costs $5 and a book $6")).toBe("A pen costs $5 and a book $6");
  });

  it("still renders maths next to a price", () => {
    const html = render("R$ 1,50 é $x$");
    expect(html.startsWith("R$ 1,50 é ")).toBe(true);
    expect(html).toContain("katex");
  });
});
