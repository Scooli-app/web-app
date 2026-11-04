import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeacherContact } from "./TeacherContact";

const render = (name: string | null, email: string | null) =>
  renderToStaticMarkup(createElement(TeacherContact, { teacher: { userId: "u1", name, email } }));
const count = (html: string, text: string) => html.split(text).length - 1;

describe("TeacherContact", () => {
  it("shows the name and the email link", () => {
    const html = render("Ana Silva", "ana@escola.pt");
    expect(html).toContain("Ana Silva");
    expect(html).toContain('href="mailto:ana@escola.pt"');
  });

  it("shows an email once when the backend used it as the name", () => {
    expect(count(render("ana@escola.pt", "ana@escola.pt"), "ana@escola.pt")).toBe(2); // the href and the link text
  });

  it("shows a dash when there is neither", () => {
    expect(render(null, null)).toContain("—");
  });
});
