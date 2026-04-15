# .ai-loop — Lovable ↔ VS Code ↔ GitHub Closed Loop

This directory is the bridge between two repos:

- **`drts-fleet-platform`** (backend, source of truth) — managed in VS Code by LLM workers
- **`tenant-commute-hub`** (this repo, frontend UI) — managed by Lovable

## Workflow

```
VS Code LLM
  → writes FRONTEND_CHANGE_SPEC.md + FRONTEND_CHANGE_SPEC.json
  → commits + pushes

Lovable
  → reads FRONTEND_CHANGE_SPEC.json
  → implements UI changes
  → writes LOVABLE_CHANGE_FEEDBACK.md + API_GAP_REQUESTS.json
  → commits + pushes

VS Code LLM
  → reads LOVABLE_CHANGE_FEEDBACK.md + API_GAP_REQUESTS.json
  → opens issues / adds API endpoints / updates contracts in drts-fleet-platform
  → writes BACKEND_DELIVERY_NOTE.md + updates CONTRACT_VERSION.lock
  → commits + pushes to drts-fleet-platform, then here

Lovable
  → reads BACKEND_DELIVERY_NOTE.md
  → wires up new API calls
  → next iteration begins
```

## Files

| File | Written by | Read by | Purpose |
|------|-----------|---------|---------|
| `FRONTEND_CHANGE_SPEC.md` | VS Code LLM | Lovable | Human-readable spec for this iteration's UI changes |
| `FRONTEND_CHANGE_SPEC.json` | VS Code LLM | Lovable | Machine-readable spec (components, routes, API calls needed) |
| `LOVABLE_CHANGE_FEEDBACK.md` | Lovable | VS Code LLM | Summary of what was built and what APIs are missing |
| `API_GAP_REQUESTS.json` | Lovable | VS Code LLM | Structured list of missing/broken API endpoints |
| `UI_DECISIONS.md` | Both | Both | Persistent record of UI architecture decisions |
| `QA_STATUS.md` | Both | Both | Current QA status — what's verified, what's broken |
| `BACKEND_DELIVERY_NOTE.md` | VS Code LLM | Lovable | Announces new API endpoints/contracts available in drts-fleet-platform |
| `CONTRACT_VERSION.lock` | VS Code LLM | Lovable | Locks the drts-fleet-platform contract commit this frontend is aligned with |

## Rules

1. **Never edit CONTRACT_VERSION.lock manually** — only VS Code LLM updates it after verified backend delivery
2. **API_GAP_REQUESTS.json is append-only per iteration** — do not delete resolved gaps, mark them `resolved`
3. **FRONTEND_CHANGE_SPEC.json drives Lovable** — all UI work in an iteration must trace to a spec entry
4. **Boundary contract** — see `drts-fleet-platform/docs/02-architecture/tenant-commute-hub-boundary.md` for what the frontend is and is not allowed to do
