// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { keepOpenOnToastClick } from "./sonner";

describe("keepOpenOnToastClick", () => {
  it("keeps a dialog open when the click lands on a toast", () => {
    const toaster = document.createElement("ol");
    toaster.setAttribute("data-sonner-toaster", "");
    const action = document.createElement("button");
    toaster.appendChild(action);
    document.body.appendChild(toaster);
    const preventDefault = vi.fn();

    keepOpenOnToastClick({ target: action, preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    toaster.remove();
  });

  it("lets any other outside click close the dialog", () => {
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    const preventDefault = vi.fn();

    keepOpenOnToastClick({ target: outside, preventDefault });
    keepOpenOnToastClick({ target: null, preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    outside.remove();
  });
});
