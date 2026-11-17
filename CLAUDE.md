## Branching and pull requests (BINDING)

- **Every pull request targets `develop`.** Never open a PR against `main`, and never merge into `main`, unless the user explicitly asks for a release or promotion to `main` in this conversation.
- Start feature/fix branches from `origin/develop`, not `main`. If a branch was cut from `main`, rebase or cherry-pick it onto `develop` before opening the PR.
- "Merge it" / "merge when ready" means merge the PR into `develop`. It is never permission to merge into `main`.
- Before calling `create_pull_request` or `merge_pull_request`, check that `base` is `develop`. If it is `main`, stop and ask the user.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
