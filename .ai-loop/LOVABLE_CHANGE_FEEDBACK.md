# Lovable Change Feedback

> Written by: Claude (cross-repo agent acting on behalf of Lovable workflow)
> Iteration: 1 — Tenant Governance UI
> Date: 2026-05-14

## Iteration

Iteration 1 — Tenant Governance UI (TCH-SDK-CONSUME-001 in drts-fleet-platform)

## What was completed

All three scope items from FRONTEND_CHANGE_SPEC.md Iteration 1:

- [x] **TN_CostCenter** — `/cost-centers` route + `CostCenters.tsx` page.
      Lists active + disabled cost centers with search + show-inactive
      toggle, create/edit form (code/name required, owner user id +
      display name), disable action with optional reason prompt,
      coverage report card (totalBookings / resolvedCount /
      unresolvedCount / disabledHits + top unresolved-text samples
      with suggestions). Commit: `4db72d0`.
- [x] **TN_Rules** — `/rules` route + `Rules.tsx` page. CRUD +
      reorder (up/down arrows that call `reorderApprovalRules` with the
      full ordered ruleId list) + dynamic conditions array (13-field
      whitelist × 9 operators) + dynamic approvers array (5
      principal kinds with kind-specific ref input) + effectiveFrom/
      Until + timeoutHoursOverride + fallbackPolicyOverride + dry-run
      evaluate panel that calls `evaluateApprovalRules` and renders
      decision badge / warnings / matched rules / approval plan.
      Commit: `8f4e613`.
- [x] **TN_NewBooking** — surgical refactor of existing
      `NewBooking.tsx`:
        * Cost-center field upgraded to directory-backed `Select`
          when `listCostCenters({ activeOnly: true })` returns
          entries; falls back to free-text Input (with explanatory
          note) in grandfather mode.
        * Tenant quota summary loaded on mount and displayed
          inline next to the cost-center field.
        * 「預覽額度影響」button calls
          `previewTenantBookingQuotaImpact` and renders a card
          with triggered-decision badge (OK / 警示 / 需審批 /
          封鎖), per-impact remaining amounts, and the
          design-response-§Q7 reminder that preview is non-binding.
        * Submit error handler maps the 5 canonical error codes
          (BOOKING_COST_CENTER_INVALID/UNKNOWN/DISABLED,
          QUOTA_INSUFFICIENT_AT_COMMIT, APPROVAL_NOT_AUTHORIZED,
          APPROVAL_NO_RESOLVABLE_APPROVERS) to user-actionable
          Chinese messages per design response §I.
        * QUOTA_INSUFFICIENT_AT_COMMIT additionally re-runs the
          preview so the user immediately sees current remaining
          quota before retry.
        * Partner-mode unaffected (cost-center / quota loads wrapped
          in `.catch(() => empty)` to tolerate scopes without tenant
          governance).
      Commit: `593edc3`.

API client extension (`src/lib/drts-shim/api-client.ts`):

- Added all 5 cost-center methods (listCostCenters, getCostCenter,
  getTenantCostCenterCoverageReport, upsertCostCenter,
  disableCostCenter).
- Added all 6 approval-rule methods (listApprovalRules,
  getApprovalRule, upsertApprovalRule with PUT-when-ruleId
  semantics, disableApprovalRule, reorderApprovalRules,
  evaluateApprovalRules).
- Added 2 quota methods (getTenantQuotaSummary,
  previewTenantBookingQuotaImpact).
- Idempotency-Key + X-Request-Id auto-injected (already in base
  request helper; no change needed).

## What was NOT completed and why

Out of Iteration 1 scope but worth flagging for Iteration 2 backlog:

- **Approval-request management UI** — the page where a tenant
  approver sees their pending requests + approves/rejects has not
  been added. The contract surface
  (`listTenantApprovalRequests` /
  `approveTenantApprovalRequest` / `rejectTenantApprovalRequest` /
  `escalateTenantApprovalRequest`) is in core; the methods were
  not added to api-client this iteration because no scope item
  asked for it. Defer to Iteration 2 once UAT decides whether to
  use Ops Console (`OPS-UI-APR-001` in drts-fleet-platform) or a
  tenant-side surface.
- **BookingDetail.tsx surfacing approvalState** — current
  BookingDetail.tsx was not touched. Once an approver decides on
  a booking, the booking lifecycle moves from `pending` to
  `approved`/`rejected`; the detail page should render that
  badge. Small follow-up.
- **`pnpm sync:contracts` auto-trigger** — TCH-SDK-VERIF-001
  flagged that updating `CONTRACT_VERSION.lock` does not
  auto-regenerate the shim. Husky pre-commit hook or CI gate
  recommended. Not added in this iteration to avoid mixing
  build-tooling concerns into a UI iteration.

## UI decisions made

- `/cost-centers` and `/rules` routes are wrapped in
  `PartnerShellOnly` (mirrors AddressManagement); they are
  invisible in partner-mode. Partner-mode logins remain unable
  to manage tenant governance.
- Cost-center code field is upper-cased on edit and locked when
  editing an existing record (CC code is the natural primary
  key in the directory).
- Disable cost-center action uses `window.prompt` for the
  optional reason note. Acceptable as a P1 UX; can be upgraded
  to a Dialog in a future polish pass.
- `ordered_chain` approval mode shown in the Rules form with an
  explicit annotation: «P1 暫以 all_of_parallel 執行» —
  matches the documented P1 limit in
  `drts-fleet-platform/docs/03-runbooks/phase1-officially-complete-20260514.md` §5.

## API gaps found

None new beyond what TCH-SDK-VERIF-001 already documented. The
current Iteration 1 scope is fully satisfiable with the contract
methods listed in `FRONTEND_CHANGE_SPEC.md`. No new entries to
`API_GAP_REQUESTS.json`.

## Questions for VS Code LLM

- Should the next iteration be (a) approval-request management
  UI on the tenant side, or (b) BookingDetail approval-state
  surfacing, or (c) the auto-sync trigger? My read is (b) is the
  smallest follow-up that closes the loop on TN_NewBooking
  end-to-end visibility, but (c) is most operationally valuable
  for the cross-repo workflow. Defer to design / supervisor
  decision.
