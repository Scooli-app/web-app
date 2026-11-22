## Branching and pull requests (BINDING)

- **Every pull request targets `develop`.** Never open a PR against `main`, and never merge into `main`, unless the user explicitly asks for a release or promotion to `main` in this conversation.
- Start feature/fix branches from `origin/develop`, not `main`. If a branch was cut from `main`, rebase or cherry-pick it onto `develop` before opening the PR.
- "Merge it" / "merge when ready" means merge the PR into `develop`. It is never permission to merge into `main`.
- Before calling `create_pull_request` or `merge_pull_request`, check that `base` is `develop`. If it is `main`, stop and ask the user.

## UI/UX rules

- Selectable cards (checkbox cards, option cards, lesson or outcome lists) are clickable over their whole area, not only on the checkbox. Inner controls with their own job (an expand chevron, an info tooltip, a link) keep their own click and don't toggle the card. Keep it accessible: one focusable control per card (a `<label>` around the checkbox, or the checkbox kept as the keyboard control), a visible focus ring and a hover state.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Mapa de funcionalidades

- Usa o mapa (skill `before-building`; sem ela, segue `../scooli-map/AGENTS.md`) só para trabalho que cruza repos: impacto entre repos ("o que parte se mudar X"), planear uma funcionalidade que toca mais de um repo, entrada num país novo, ou saber se algo já existe noutro repo. Em sessões remotas, clona `Scooli-app/scooli-map` ao lado deste repo se não existir; se for impossível, diz que o mapa não está disponível e continua.
- Para trabalho num só repo ou perguntas estreitas, não uses o mapa: pesquisa o código e usa `graphify query`, `path` ou `explain` quando precisares de relações (quem chama, como A liga a B).
- Ao criar uma funcionalidade nova, ou ao mudar uma que o mapa lista, atualiza o respetivo ficheiro no `scooli-map` (carimbar, atualizar o índice, correr o check e fazer push para a `main` do `scooli-map`).
- Nunca leias o `graphify-out/GRAPH_REPORT.md` inteiro; usa `graphify query`, `path` ou `explain`.
