import { describe, expect, it } from "vitest";
import { itemsCarryOwnMarkers, listItemPrefix } from "./list-markers";

// Multiple-choice options come as an ordered_list whose items already start with
// "A)", "B)", ... and used to render as "1. A) ...".

describe("listItemPrefix", () => {
  const options = ["A) 2/4", "B) 2/6", "C) 4/2"];

  it("adds no number when every item carries its own letter", () => {
    expect(itemsCarryOwnMarkers(options)).toBe(true);
    expect(options.map((o, i) => `${listItemPrefix(true, options, i)}${o}`)).toEqual(options);
  });

  it("numbers and bullets plain items as before", () => {
    const items = ["Evaporação", "Condensação"];
    expect(listItemPrefix(true, items, 1)).toBe("2. ");
    expect(listItemPrefix(false, items, 0)).toBe("• ");
    expect(listItemPrefix(false, items, 0, "-")).toBe("- ");
  });

  it("keeps numbering when only some items start with a letter", () => {
    const items = ["A) primeira opção", "texto sem marcador"];
    expect(itemsCarryOwnMarkers(items)).toBe(false);
    expect(listItemPrefix(true, items, 0)).toBe("1. ");
  });

  it("does not treat words that start with a capital as markers", () => {
    expect(itemsCarryOwnMarkers(["A água evapora", "O vapor sobe"])).toBe(false);
  });
});
