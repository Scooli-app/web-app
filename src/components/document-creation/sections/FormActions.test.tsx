// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MissingField } from "../missingField";
import type { DocumentTypeConfig } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => "en",
}));
vi.mock("@/hooks/useAccountAccess", () => ({
  useAccountAccess: () => ({ isLocked: false, guard: () => true, hasCredits: false }),
}));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn(), useAppSelector: () => null }));

import { FormActions } from "./FormActions";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(missingFields: MissingField[], onMissingFieldClick = vi.fn()) {
  host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  act(() => {
    created.render(
      createElement(FormActions, {
        documentType: { id: "worksheet" } as DocumentTypeConfig,
        isLoading: false,
        isFormValid: missingFields.length === 0,
        error: "",
        onSubmit: vi.fn(),
        missingFields,
        onMissingFieldClick,
      }),
    );
  });
  return { host, onMissingFieldClick };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("FormActions missing-field hint", () => {
  it("names every missing field", () => {
    const { host } = mount(["subject", "worksheetVariant"]);
    expect(host.textContent).toContain(
      "documentCreation.missing.subject and documentCreation.missing.worksheetVariant",
    );
  });

  it("takes the teacher to the first missing field on tap", () => {
    const { host, onMissingFieldClick } = mount(["subject", "worksheetVariant"]);
    const hint = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("missing.prefix"));
    act(() => hint?.click());
    expect(onMissingFieldClick).toHaveBeenCalledWith("subject");
  });

  it("shows no hint when nothing is missing", () => {
    const { host } = mount([]);
    expect(host.textContent).not.toContain("missing.prefix");
  });
});
