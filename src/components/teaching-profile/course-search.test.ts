import { describe, expect, it } from "vitest";
import { rankCourses } from "@/components/teaching-profile/course-search";
import type { Qualification } from "@/shared/types/teaching-profile";

const course = (code: string, title: string, cnaefLabel: string | null = null): Qualification => ({
  code,
  versionId: null,
  title,
  level: 4,
  cnaefCode: null,
  cnaefLabel,
  referentialFormat: "RA",
});

const CATALOG = [
  course("811001", "Bombeiro/a", "Serviços de segurança"),
  course("481038", "Técnico/a de Gestão e Programação de Sistemas Informáticos", "Ciências informáticas"),
  course("481039", "Técnico/a de Informática - Sistemas", "Ciências informáticas"),
  course("811003", "Técnico/a de Turismo", "Turismo e lazer"),
  course("341001", "Técnico/a de Comércio", "Comércio"),
  course("811004", "Técnico/a de Animação Turística", "Turismo e lazer"),
  course("811005", "Técnico/a de Manutenção de Equipamentos Turísticos", "Turismo e lazer"),
  course("621001", "Técnico/a de Viticultura, Enologia e Enoturismo", "Produção agrícola e animal"),
];

const titles = (term: string) => rankCourses(CATALOG, term).results.map((result) => result.title);

describe("rankCourses", () => {
  it("finds a multi-word name across the /a gender form", () => {
    expect(titles("tecnico de informatica")).toEqual([
      "Técnico/a de Informática - Sistemas",
      "Técnico/a de Gestão e Programação de Sistemas Informáticos",
    ]);
  });

  it("matches the words in any order", () => {
    expect(titles("sistemas informatica")).toContain("Técnico/a de Informática - Sistemas");
  });

  it("puts title matches before CNAEF area matches", () => {
    expect(titles("informatic")).toEqual([
      "Técnico/a de Informática - Sistemas",
      "Técnico/a de Gestão e Programação de Sistemas Informáticos",
    ]);
    expect(titles("seguranca")).toEqual(["Bombeiro/a"]);
  });

  it("matches other forms of a word, before a word that only contains it", () => {
    expect(titles("turismo")).toEqual([
      "Técnico/a de Turismo",
      "Técnico/a de Animação Turística",
      "Técnico/a de Manutenção de Equipamentos Turísticos",
      "Técnico/a de Viticultura, Enologia e Enoturismo",
    ]);
    expect(titles("informatica")).toContain("Técnico/a de Gestão e Programação de Sistemas Informáticos");
  });

  it("puts a title that starts with the term first", () => {
    expect(titles("tecnico de t")[0]).toBe("Técnico/a de Turismo");
  });

  it("finds a course by code", () => {
    expect(titles("481039")).toEqual(["Técnico/a de Informática - Sistemas"]);
  });

  it("falls back to the closest courses when no course has every word", () => {
    const { results, partialMatch } = rankCourses(CATALOG, "curso profissional de turismo e hotelaria");
    expect(partialMatch).toBe(true);
    expect(results.map((result) => result.title).slice(0, 3)).toEqual([
      "Técnico/a de Turismo",
      "Técnico/a de Animação Turística",
      "Técnico/a de Manutenção de Equipamentos Turísticos",
    ]);
  });

  it("ranks the fallback by the number of words that match", () => {
    expect(titles("tecnico informatica redes")[0]).toBe("Técnico/a de Informática - Sistemas");
  });

  it("returns nothing for an empty term or when no word matches", () => {
    expect(rankCourses(CATALOG, "  ")).toEqual({ results: [], partialMatch: false });
    expect(rankCourses(CATALOG, "das para")).toEqual({ results: [], partialMatch: false });
    expect(rankCourses(CATALOG, "xyz")).toEqual({ results: [], partialMatch: false });
  });
});
