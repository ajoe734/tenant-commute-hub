# UI Decisions Log

Persistent record of architectural UI decisions. Append-only — do not remove entries.

---

## UID-001 — 2026-04-15 — Repo boundary established

**Decision:** `tenant-commute-hub` is a pure UI consumer. All business logic, state machines, and data truth live in `drts-fleet-platform`.

**Rationale:** Dual-truth problem identified in phase1 review. Supabase direct calls in the frontend create a second truth for bookings, billing, audit, etc. that diverges from core.

**Impact:** All Supabase direct calls for business data must be replaced with core API calls over time. Supabase may remain for auth token issuance only.

**Reference:** `drts-fleet-platform/docs/02-architecture/tenant-commute-hub-boundary.md`

---

## UID-002 — 2026-04-15 — camelCase local, snake_case wire

**Decision:** Frontend TypeScript code uses `camelCase` internally. All API request bodies and response parsing use `snake_case` to match the wire format.

**Rationale:** Core API wire format is `snake_case` per engineering conventions §5.4.2. Frontend may use camelCase only in local runtime memory.

**Reference:** `tenant-commute-hub-boundary.md §1`
