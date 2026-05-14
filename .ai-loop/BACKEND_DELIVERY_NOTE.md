# Backend Delivery Note - Iteration 1

> Written by: VS Code LLM (drts-fleet-platform)
> Date: 2026-05-14
> Contract commit: `373225b746ab15b72b7c5b954b24b89b4b8ce23f`
> Source task: `TCH-SDK-BUMP-001`

## Available Now

The tenant governance backend wave is closed in `drts-fleet-platform` machine
truth:

- `BE-CC-001`: tenant cost-center directory
- `BE-RULE-001`: tenant approval rules and evaluator
- `BE-QUOTA-001`: tenant quota read model, policy, preview, and ledger
- `BE-APR-001`: tenant booking approval request lifecycle
- `DOC-API-GOV-001`: OpenAPI and audit documentation

## Tenant Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/tenant/cost-centers` | List cost centers |
| `GET` | `/api/tenant/cost-centers/coverage` | Cost-center coverage report |
| `GET` | `/api/tenant/cost-centers/:code` | Cost-center detail |
| `POST` | `/api/tenant/cost-centers` | Create or update cost center |
| `POST` | `/api/tenant/cost-centers/disable` | Disable cost center |
| `GET` | `/api/tenant/quotas` | Tenant quota summary |
| `GET` | `/api/tenant/cost-centers/:code/quota` | Cost-center quota summary |
| `POST` | `/api/tenant/quotas/policies` | Upsert quota policy |
| `POST` | `/api/tenant/quotas/preview` | Preview booking quota impact |
| `GET` | `/api/tenant/quotas/ledger` | List quota ledger |
| `GET` | `/api/tenant/approval-rules` | List approval rules |
| `GET` | `/api/tenant/approval-rules/:ruleId` | Approval-rule detail |
| `POST` | `/api/tenant/approval-rules` | Create approval rule |
| `PUT` | `/api/tenant/approval-rules/:ruleId` | Update approval rule |
| `POST` | `/api/tenant/approval-rules/:ruleId/disable` | Disable approval rule |
| `POST` | `/api/tenant/approval-rules/reorder` | Reorder approval rules |
| `POST` | `/api/tenant/approval-rules/evaluate` | Dry-run/evaluate approval rules |
| `GET` | `/api/tenant/approval-requests` | List booking approval requests |
| `GET` | `/api/tenant/approval-requests/:approvalRequestId` | Approval-request detail |
| `POST` | `/api/tenant/approval-requests/:approvalRequestId/approve` | Approve request |
| `POST` | `/api/tenant/approval-requests/:approvalRequestId/reject` | Reject request |
| `POST` | `/api/tenant/approval-requests/:approvalRequestId/escalate` | Escalate request |

## Client Surface

Use `@drts/api-client` at the locked contract commit. Relevant methods are
listed in `FRONTEND_CHANGE_SPEC.md` and map directly to the endpoints above.

## Error Codes To Surface

- `BOOKING_COST_CENTER_UNKNOWN`
- `BOOKING_COST_CENTER_INVALID`
- `BOOKING_COST_CENTER_DISABLED`
- `QUOTA_INSUFFICIENT_AT_COMMIT`
- `APPROVAL_NOT_AUTHORIZED`
- `APPROVAL_NO_RESOLVABLE_APPROVERS`

## Next Step

`tenant-commute-hub` should implement `TCH-SDK-BUMP-001` from
`FRONTEND_CHANGE_SPEC.json`. If the frontend finds a concrete missing contract,
write it to `API_GAP_REQUESTS.json` with the exact missing endpoint, method,
field, or error envelope.
