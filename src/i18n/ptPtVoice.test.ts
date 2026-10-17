import { describe, expect, it } from "vitest";
import messages from "../../messages/pt-PT.json";

/**
 * The pt-PT app speaks to teachers informally (tu). These are the formal
 * (você / 3rd-person) imperatives and verb forms that kept slipping in.
 */
const FORMAL_FORMS =
  /\b(selecione|introduza|preencha|descreva|escolha|adicione|clique|faça|tente|insira|escreva|carregue|verifique|aguarde|aceda|partilhe|defina|crie|edite|reveja|desbloqueie|atualize|inicie|pretende|deseja|você|está a perder|quer partilhar|tem a certeza|receberá|ainda não tem|nunca pare)\b/i;

/** Same words used correctly: nouns ("escolha múltipla", "duplo-clique") and subjunctives. */
const LEGITIMATE = /escolha múltipla|sem escolha|duplo-clique|clique direito|que a scooli escreva/gi;

function collect(node: unknown, path: string, out: string[]) {
  if (typeof node === "string") {
    if (FORMAL_FORMS.test(node.replace(LEGITIMATE, ""))) out.push(`${path} = ${node}`);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) collect(value, path ? `${path}.${key}` : key, out);
  }
}

describe("pt-PT voice", () => {
  it("uses tu, never the formal você forms", () => {
    const offenders: string[] = [];
    collect(messages, "", offenders);
    expect(offenders).toEqual([]);
  });
});
