# QA Status

Last updated: 2026-05-14
Current iteration: 1 (Tenant Governance UI)

## Legend
- ✅ verified
- ⚠️ partial / known issue
- ❌ broken
- — not yet tested

## Iteration 1 — Tenant Governance UI

| Scope | Status | Notes |
|---|---|---|
| TN_CostCenter — list / detail / create-update / disable | ✅ | `pnpm typecheck`, `lint`, `build` all pass; commit `4db72d0`. |
| TN_CostCenter — coverage report card | ✅ | Calls `getTenantCostCenterCoverageReport`; falls back gracefully if endpoint not exposed. |
| TN_Rules — list / CRUD / disable | ✅ | Commit `8f4e613`. |
| TN_Rules — reorder up/down | ✅ | Calls `reorderApprovalRules` with full ordered list per drts execution packet §4.2. |
| TN_Rules — dry-run evaluate | ✅ | Calls `evaluateApprovalRules` with `operation=dry_run`; renders TenantApprovalEvaluationResult outcome. |
| TN_NewBooking — directory-backed cost-center selector | ✅ | Falls back to free-text Input in grandfather mode. Commit `593edc3`. |
| TN_NewBooking — quota preview card | ✅ | Manual «預覽額度影響» button; auto-resets when costCenter changes. Non-binding per design response §Q7. |
| TN_NewBooking — approval-required state | ⚠️ | Surfaced today via the quota preview «需審批» badge. Dedicated approval-status surfacing on BookingDetail.tsx is a follow-up. |
| TN_NewBooking — 5 error code handlers | ✅ | BOOKING_COST_CENTER_INVALID/UNKNOWN/DISABLED, QUOTA_INSUFFICIENT_AT_COMMIT (also auto re-previews), APPROVAL_NOT_AUTHORIZED, APPROVAL_NO_RESOLVABLE_APPROVERS — all mapped to user-actionable Chinese messages per design response §I. |

## Build / typecheck / lint

| Check | Status | Notes |
|---|---|---|
| `pnpm sync:contracts` | ✅ | Manual run regenerates shim from pinned `373225b`. **No auto-trigger** — open follow-up. |
| `pnpm typecheck` | ✅ | Passes after Iteration 1. |
| `pnpm lint` | ✅ | Passes (no warnings of note). |
| `pnpm build` | ✅ | Builds successfully. Bundle ~514 kB / 152 kB gzipped — chunk-size warning unchanged. |

## Core API connectivity

| Check | Status | Notes |
|---|---|---|
| Bearer auth header | ✅ | Existing wrapper untouched. |
| `X-Request-Id` on all requests | ✅ | Auto-injected by `request()` helper. |
| `Idempotency-Key` on POST mutations | ✅ | Auto-injected by `request()` helper. |

## Known gaps for Iteration 2 backlog

- ❌ Approval-request management UI for tenant approvers
  (`listTenantApprovalRequests` / `approveTenantApprovalRequest` /
  `rejectTenantApprovalRequest`).
- ⚠️ BookingDetail.tsx does not yet surface `approvalState` /
  `approvalRequestIds`.
- ⚠️ No automation for `pnpm sync:contracts` when
  `CONTRACT_VERSION.lock` updates (TCH-SDK-VERIF-001 finding).
