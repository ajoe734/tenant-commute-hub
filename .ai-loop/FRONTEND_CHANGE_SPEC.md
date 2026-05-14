# Frontend Change Spec - Iteration 1

> Written by: VS Code LLM (drts-fleet-platform)
> Date: 2026-05-14
> Source task: `TCH-SDK-BUMP-001`
> Contract commit: `373225b746ab15b72b7c5b954b24b89b4b8ce23f`

## Summary

Tenant governance backend, API docs, and client surfaces are now closed in
`drts-fleet-platform`. `tenant-commute-hub` should bump/use the shared client
surface for the redesigned tenant governance screens instead of inventing local
schemas or treating Supabase as the business authority.

## Scope

- [x] `TN_CostCenter`: wire cost-center list/detail/create-update/disable and
      coverage readout to the shared client.
- [x] `TN_Rules`: wire approval-rule list/detail/create-update/disable/reorder,
      dry-run/evaluate, and quota-aware rule displays to the shared client.
- [x] `TN_NewBooking`: wire cost-center selection, quota preview,
      approval-required state, and approval-request status to the shared client.
- [x] Preserve the closed-loop request rules: Authorization, `X-Request-Id`, and
      `Idempotency-Key` on mutating command endpoints.
- [x] Keep `API_GAP_REQUESTS.json` empty unless an exact missing endpoint,
      method, field, or error envelope is found against the locked contract.

## Shared Client Surface

Use `@drts/api-client` from contract commit
`373225b746ab15b72b7c5b954b24b89b4b8ce23f`.

Relevant methods:

```text
listCostCenters
getCostCenter
getTenantCostCenterCoverageReport
upsertCostCenter
disableCostCenter
getTenantQuotaSummary
getTenantCostCenterQuota
upsertTenantQuotaPolicy
previewTenantBookingQuotaImpact
listTenantQuotaLedger
listApprovalRules
upsertApprovalRule
reorderApprovalRules
evaluateApprovalRules
disableApprovalRule
listApprovalRequests
getApprovalRequest
approveApprovalRequest
rejectApprovalRequest
escalateApprovalRequest
```

## Required Error Handling

Handle these concrete UI-visible errors:

- `BOOKING_COST_CENTER_UNKNOWN`
- `BOOKING_COST_CENTER_INVALID`
- `BOOKING_COST_CENTER_DISABLED`
- `QUOTA_INSUFFICIENT_AT_COMMIT`
- `APPROVAL_NOT_AUTHORIZED`
- `APPROVAL_NO_RESOLVABLE_APPROVERS`

## References

- `drts-fleet-platform/packages/api-client/src/index.ts`
- `drts-fleet-platform/packages/contracts/src/index.ts`
- `drts-fleet-platform/docs/04-api/openapi-spec.yaml`
- `drts-fleet-platform/docs/03-runbooks/tenant-governance-wave-execution-packet-20260513.md`
