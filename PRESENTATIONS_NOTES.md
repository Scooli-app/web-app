# Presentations — Implementation Decisions

Source: [Confluence parent page](https://scooli.atlassian.net/wiki/spaces/Scooli/pages/9404441)
Epic: [SCOOL-119](https://scooli.atlassian.net/browse/SCOOL-119)

This file records the decisions made before kickoff. Override here and on the Confluence parent page if any choice needs to change.

## Resolved decisions

| # | Decision | Chosen value | Rationale |
|---|---|---|---|
| 1 | Block `id` format | Short sequential (`s1`, `s2-b1`) | LLM-friendly for chat-edit prompts, easy to debug. |
| 2 | Inline text representation | Limited Markdown strings | Simpler AI output; smaller payload; tiny dedicated parser on render. |
| 3 | Schema source of truth | Hand-maintained Zod + JSON Schema in lockstep | Faster v1. CI test for round-trip parity. Codegen later if drift becomes a problem. |
| 4 | Default `slideCount` | 10 | Predictable. Range 5–20 in UI. |
| 5 | Image policy | On by default (Pro/Org only feature anyway) | Cap at 8 images per deck regardless of slide count. |
| 6 | **Plan gating** | **Pro / Org only — NO free tier access** | Hard requirement from product. Sidebar item gated; clicking as free user opens the upgrade modal. |
| 7 | Structured-output primary provider | OpenAI Structured Outputs (strict mode) | Claude tool use as fallback. Backend decision; FE unaffected. |
| 8 | Hard slide cap | 20 slides | Range 5–20 in the creation form. |

## Implementation notes (FE-specific)

- **Sidebar**: "Apresentações" item — visible to all logged-in users, but free users see a Pro badge. Click → upgrade modal (use existing `upgrade-plan-modal.tsx`).
- **Direct URL access** (`/presentation` or `/presentation/:id`) for free users → server-side redirect to upgrade modal route, or client guard with redirect.
- **Creation page** assumes Pro/Org access (route guard handles it). No in-form upgrade copy needed.
- **Image toggle** in the creation form: default ON, single checkbox to disable. No per-slide control in v1.
