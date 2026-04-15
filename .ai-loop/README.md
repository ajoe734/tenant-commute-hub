# .ai-loop — Lovable ↔ GitHub ↔ drts-fleet-platform Closed Loop

Fully GitHub-driven. No manual steps needed after initial setup.

## Flow

```
① VS Code LLM (drts-fleet-platform)
    writes .ai-loop-outgoing/FRONTEND_CHANGE_SPEC.json
    ──push──▶ GitHub Action (push-delivery-note.yml)
                copies spec → tenant-commute-hub/.ai-loop/
                [skip ci] commit + push to tenant-commute-hub

② Lovable
    detects new FRONTEND_CHANGE_SPEC.json on GitHub
    implements UI changes
    ──push──▶ tenant-commute-hub/.ai-loop/LOVABLE_CHANGE_FEEDBACK.md
              tenant-commute-hub/.ai-loop/API_GAP_REQUESTS.json

③ GitHub Action (notify-core-on-feedback.yml) in tenant-commute-hub
    detects push to LOVABLE_CHANGE_FEEDBACK.md / API_GAP_REQUESTS.json
    ──repository_dispatch──▶ drts-fleet-platform (event: frontend-feedback)

④ GitHub Action (receive-frontend-feedback.yml) in drts-fleet-platform
    fetches feedback files → saves to .ai-loop-incoming/
    enqueues orchestrator event → .orchestrator/event-queue.jsonl
    [skip ci] commit + push

⑤ VS Code LLM orchestrator wakes up
    reads .ai-loop-incoming/LOVABLE_CHANGE_FEEDBACK.md
    reads .ai-loop-incoming/API_GAP_REQUESTS.json
    adds missing API endpoints, contracts, SDK types
    writes .ai-loop-outgoing/BACKEND_DELIVERY_NOTE.md
    updates .ai-loop-outgoing/CONTRACT_VERSION.lock
    ──push──▶ GitHub Action (push-delivery-note.yml) → back to ①
```

## Files in this repo (.ai-loop/)

| File | Written by | Purpose |
|------|-----------|---------|
| `FRONTEND_CHANGE_SPEC.md` | drts-fleet-platform (via push-delivery-note.yml) | Human-readable spec for Lovable |
| `FRONTEND_CHANGE_SPEC.json` | drts-fleet-platform (via push-delivery-note.yml) | Machine-readable task list for Lovable |
| `LOVABLE_CHANGE_FEEDBACK.md` | Lovable | What was done, what's missing |
| `API_GAP_REQUESTS.json` | Lovable | Structured list of missing API / fields / enums |
| `UI_DECISIONS.md` | Both | Persistent UI architecture decisions |
| `QA_STATUS.md` | Both | QA tracking across pages |
| `BACKEND_DELIVERY_NOTE.md` | drts-fleet-platform (via push-delivery-note.yml) | New API endpoints / contracts delivered |
| `CONTRACT_VERSION.lock` | drts-fleet-platform (via push-delivery-note.yml) | Locked contract commit hash |

## Files in drts-fleet-platform

| Path | Purpose |
|------|---------|
| `.ai-loop-outgoing/` | VS Code LLM writes here; GitHub Action pushes to tenant |
| `.ai-loop-incoming/` | GitHub Action writes here when Lovable pushes feedback |
| `.github/workflows/push-delivery-note.yml` | Pushes outgoing files to tenant-commute-hub |
| `.github/workflows/receive-frontend-feedback.yml` | Receives repository_dispatch from tenant |

## Required GitHub Secrets

### In tenant-commute-hub
| Secret | Value |
|--------|-------|
| `CORE_REPO_PAT` | PAT with `repo` scope on `drts-fleet-platform` |

### In drts-fleet-platform
| Secret | Value |
|--------|-------|
| `TENANT_REPO_PAT` | PAT with `repo` scope on `tenant-commute-hub` |

## Boundary contract
`drts-fleet-platform/docs/02-architecture/tenant-commute-hub-boundary.md`
