import en from "../../messages/en.json";
import pt from "../../messages/pt-PT.json";
import { describe, expect, it } from "vitest";

/** The Pro trial / read-only lock copy (ENG-320/321): every key in both languages, and the agreed pt-PT lines. */
function keys(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [prefix];
  return Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("Pro trial copy", () => {
  it.each(["trial", "banner", "lock", "trialStatusCard", "trialActivation"] as const)("has the same billing.%s keys in pt-PT and en", (ns) => {
    expect(keys(en.billing[ns]).sort()).toEqual(keys(pt.billing[ns]).sort());
  });

  it("has paywall copy for every lock reason", () => {
    for (const reason of ["account_locked", "trial_expired", "trial_not_activated"] as const) {
      expect(pt.billing.upgradePlanModal.reasons[reason].title).toBeTruthy();
      expect(en.billing.upgradePlanModal.reasons[reason].description).toBeTruthy();
    }
  });

  it("uses the agreed pt-PT wording", () => {
    expect(pt.billing.trial.activateCta).toBe("Ativar o meu mês Pro");
    expect(pt.billing.banner.lockedTitle).toBe("A tua conta está em modo de leitura");
    expect(pt.billing.upgradePlanModal.reasons.trial_expired.title).toBe("O teu mês Pro terminou");
    expect(pt.billing.trialActivation.successTitle).toBe("O teu mês Pro começou — termina a {date}");
    expect(pt.billing.lock.printMessage).toBe("Atualiza para Pro para imprimir");
  });
});
