import { useEffect, useMemo, useState } from "react";
import {
  type EvaluateTenantApprovalRuleCommand,
  type TenantApprovalEvaluationResult,
  type TenantApprovalFallbackPolicy,
  type TenantApprovalMode,
  type TenantApprovalRuleAction,
  type TenantApprovalRuleCondition,
  type TenantApprovalRuleConditionField,
  type TenantApprovalRuleConditionOperator,
  type TenantApprovalRuleRecord,
  type TenantPrincipalKind,
  type TenantPrincipalRef,
  type UpsertTenantApprovalRuleCommand,
} from "@drts/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

const RULE_FIELDS: Array<{ value: string; label: string }> = [
  { value: "booking.amount_minor", label: "預訂金額 (minor units)" },
  { value: "booking.business_dispatch_subtype", label: "派車型態" },
  { value: "booking.vehicle_preference", label: "車型偏好" },
  { value: "booking.direction", label: "預約方向" },
  { value: "booking.flight_no_present", label: "是否含航班號" },
  { value: "booking.reservation_window_start", label: "預約起始時間" },
  { value: "booking.passenger.role", label: "乘客角色" },
  { value: "booking.passenger.id", label: "乘客 id" },
  { value: "cost_center.code", label: "成本中心代碼" },
  {
    value: "cost_center.monthly_quota_remaining_amount_minor",
    label: "成本中心月剩餘額度 (minor)",
  },
  {
    value: "cost_center.monthly_quota_remaining_percent",
    label: "成本中心月剩餘額度 %",
  },
  {
    value: "tenant.monthly_quota_remaining_amount_minor",
    label: "租戶月剩餘額度 (minor)",
  },
  {
    value: "tenant.monthly_quota_remaining_percent",
    label: "租戶月剩餘額度 %",
  },
];

const OPERATORS: Array<{
  value: TenantApprovalRuleConditionOperator;
  label: string;
}> = [
  { value: "eq", label: "= 等於" },
  { value: "neq", label: "≠ 不等於" },
  { value: "gt", label: "> 大於" },
  { value: "gte", label: "≥ 大於等於" },
  { value: "lt", label: "< 小於" },
  { value: "lte", label: "≤ 小於等於" },
  { value: "in", label: "in (逗號分隔)" },
  { value: "not_in", label: "not in (逗號分隔)" },
  { value: "exists", label: "存在 (true/false)" },
];

const ACTIONS: Array<{ value: TenantApprovalRuleAction; label: string }> = [
  { value: "require_approval", label: "需審批" },
  { value: "block", label: "封鎖" },
  { value: "warn", label: "警示" },
  { value: "flag_manual_review", label: "標記人工審核" },
];

const APPROVAL_MODES: Array<{ value: TenantApprovalMode; label: string }> = [
  { value: "any_of", label: "任一審批人 (any_of)" },
  { value: "all_of_parallel", label: "全部並行 (all_of_parallel)" },
  { value: "ordered_chain", label: "依序審批 (ordered_chain — P1 暫以 all_of_parallel 執行)" },
];

const PRINCIPAL_KINDS: Array<{
  value: TenantPrincipalKind;
  label: string;
  hint: string;
}> = [
  { value: "tenant_user", label: "特定使用者", hint: "需填 user id" },
  { value: "tenant_role", label: "角色代碼", hint: "需填 role code" },
  { value: "cost_center_owner", label: "成本中心 owner", hint: "需填成本中心代碼" },
  { value: "tenant_finance_admin", label: "租戶財務管理員", hint: "" },
  { value: "tenant_admin", label: "租戶管理員 (fallback)", hint: "" },
];

const FALLBACK_POLICIES: Array<{
  value: TenantApprovalFallbackPolicy;
  label: string;
}> = [
  { value: "auto_reject", label: "自動拒絕 (auto_reject)" },
  {
    value: "escalate_to_tenant_admin",
    label: "升級給租戶管理員 (預設)",
  },
  { value: "manual_ops_review", label: "人工 ops 審核" },
];

interface ConditionDraft {
  field: string;
  op: TenantApprovalRuleConditionOperator;
  value: string;
}

interface PrincipalDraft {
  kind: TenantPrincipalKind;
  ref: string; // user id / role code / cost-center code (depending on kind)
  displayName: string;
}

interface RuleFormState {
  ruleId?: string;
  ruleName: string;
  description: string;
  priority: string;
  activeFlag: boolean;
  effectiveFrom: string;
  effectiveUntil: string;
  conditions: ConditionDraft[];
  action: TenantApprovalRuleAction;
  approvalMode: TenantApprovalMode;
  approvers: PrincipalDraft[];
  timeoutHoursOverride: string;
  fallbackPolicyOverride: TenantApprovalFallbackPolicy | "default";
}

const EMPTY_CONDITION: ConditionDraft = {
  field: "booking.amount_minor",
  op: "gte",
  value: "",
};

const EMPTY_APPROVER: PrincipalDraft = {
  kind: "tenant_admin",
  ref: "",
  displayName: "",
};

const EMPTY_FORM: RuleFormState = {
  ruleName: "",
  description: "",
  priority: "100",
  activeFlag: true,
  effectiveFrom: "",
  effectiveUntil: "",
  conditions: [{ ...EMPTY_CONDITION }],
  action: "require_approval",
  approvalMode: "any_of",
  approvers: [{ ...EMPTY_APPROVER }],
  timeoutHoursOverride: "",
  fallbackPolicyOverride: "default",
};

function ruleNameOf(record: TenantApprovalRuleRecord): string {
  return record.ruleName ?? record.name ?? record.ruleId;
}

function refValue(approver: TenantPrincipalRef): string {
  if (approver.userId) return approver.userId;
  if (approver.roleCode) return approver.roleCode;
  if (approver.costCenterCode) return approver.costCenterCode;
  return "";
}

function toFormState(record: TenantApprovalRuleRecord): RuleFormState {
  return {
    ruleId: record.ruleId,
    ruleName: ruleNameOf(record),
    description: record.description ?? "",
    priority: String(record.priority),
    activeFlag: record.activeFlag,
    effectiveFrom: record.effectiveFrom ?? "",
    effectiveUntil: record.effectiveUntil ?? "",
    conditions:
      record.conditions.length > 0
        ? record.conditions.map((c) => ({
            field: c.field,
            op: c.op,
            value:
              c.value === undefined || c.value === null
                ? ""
                : Array.isArray(c.value)
                  ? c.value.join(", ")
                  : String(c.value),
          }))
        : [{ ...EMPTY_CONDITION }],
    action: record.action,
    approvalMode: record.approvalMode ?? "any_of",
    approvers:
      record.approvers.length > 0
        ? record.approvers.map((a) => ({
            kind: a.kind,
            ref: refValue(a),
            displayName: a.displayName ?? "",
          }))
        : [{ ...EMPTY_APPROVER }],
    timeoutHoursOverride:
      record.timeoutHoursOverride != null
        ? String(record.timeoutHoursOverride)
        : "",
    fallbackPolicyOverride: record.fallbackPolicyOverride ?? "default",
  };
}

function parseConditionValue(
  op: TenantApprovalRuleConditionOperator,
  rawValue: string,
): TenantApprovalRuleCondition["value"] {
  const trimmed = rawValue.trim();
  if (op === "exists") {
    return trimmed === "true";
  }
  if (op === "in" || op === "not_in") {
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (trimmed === "") {
    return null;
  }
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed.match(/^-?\d+(\.\d+)?$/)) {
    return asNumber;
  }
  if (trimmed === "true" || trimmed === "false") {
    return trimmed === "true";
  }
  return trimmed;
}

function buildPrincipalRef(draft: PrincipalDraft): TenantPrincipalRef {
  const base: TenantPrincipalRef = { kind: draft.kind };
  if (draft.displayName.trim()) {
    base.displayName = draft.displayName.trim();
  }
  if (draft.kind === "tenant_user" && draft.ref.trim()) {
    base.userId = draft.ref.trim();
  } else if (draft.kind === "tenant_role" && draft.ref.trim()) {
    base.roleCode = draft.ref.trim();
  } else if (draft.kind === "cost_center_owner" && draft.ref.trim()) {
    base.costCenterCode = draft.ref.trim().toUpperCase();
  }
  return base;
}

interface DryRunFormState {
  costCenterCode: string;
  businessDispatchSubtype: string;
  amountMinor: string;
  reservationWindowStart: string;
  passengerRole: string;
  vehiclePreference: string;
}

const EMPTY_DRY_RUN: DryRunFormState = {
  costCenterCode: "",
  businessDispatchSubtype: "enterprise_dispatch",
  amountMinor: "",
  reservationWindowStart: "",
  passengerRole: "",
  vehiclePreference: "",
};

export default function Rules() {
  const { client } = useAuth();
  const [rules, setRules] = useState<TenantApprovalRuleRecord[]>([]);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<TenantApprovalRuleRecord | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dryRunForm, setDryRunForm] = useState<DryRunFormState>(EMPTY_DRY_RUN);
  const [dryRunResult, setDryRunResult] =
    useState<TenantApprovalEvaluationResult | null>(null);
  const [dryRunRunning, setDryRunRunning] = useState(false);

  const sortedRules = useMemo(
    () =>
      [...rules].sort((left, right) => {
        if (left.activeFlag !== right.activeFlag) {
          return left.activeFlag ? -1 : 1;
        }
        return left.priority - right.priority;
      }),
    [rules],
  );

  const visibleRules = useMemo(
    () =>
      sortedRules.filter((rule) => (showInactive ? true : rule.activeFlag)),
    [sortedRules, showInactive],
  );

  const reload = async () => {
    if (!client) {
      return;
    }
    const next = await client.listApprovalRules();
    setRules(next);
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const next = await client.listApprovalRules();
        if (!active) {
          return;
        }
        setRules(next);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(toErrorMessage(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [client]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }
    if (!form.ruleName.trim()) {
      toast.error("規則名稱為必填。");
      return;
    }
    const priorityNumber = Number(form.priority);
    if (!Number.isFinite(priorityNumber)) {
      toast.error("優先序必須為數字。");
      return;
    }

    setSaving(true);
    try {
      const conditions: TenantApprovalRuleCondition[] = form.conditions
        .filter((c) => c.field.trim())
        .map((c) => ({
          field: c.field as TenantApprovalRuleConditionField,
          op: c.op,
          value: parseConditionValue(c.op, c.value),
        }));

      if (conditions.length === 0) {
        toast.error("至少需要一個條件。");
        setSaving(false);
        return;
      }

      const approvers: TenantPrincipalRef[] = form.approvers
        .filter((a) => {
          if (
            a.kind === "tenant_user" ||
            a.kind === "tenant_role" ||
            a.kind === "cost_center_owner"
          ) {
            return a.ref.trim().length > 0;
          }
          return true;
        })
        .map(buildPrincipalRef);

      const command: UpsertTenantApprovalRuleCommand = {
        ...(form.ruleId ? { ruleId: form.ruleId } : {}),
        ruleName: form.ruleName.trim(),
        ...(form.description.trim()
          ? { description: form.description.trim() }
          : {}),
        priority: priorityNumber,
        activeFlag: form.activeFlag,
        effectiveFrom: form.effectiveFrom.trim() || null,
        effectiveUntil: form.effectiveUntil.trim() || null,
        conditions,
        action: form.action,
        approvalMode:
          form.action === "require_approval" ? form.approvalMode : null,
        approvers,
        timeoutHoursOverride:
          form.timeoutHoursOverride.trim() === ""
            ? null
            : Number(form.timeoutHoursOverride),
        fallbackPolicyOverride:
          form.fallbackPolicyOverride === "default"
            ? null
            : form.fallbackPolicyOverride,
      };

      await client.upsertApprovalRule(command);
      await reload();
      setForm(EMPTY_FORM);
      setEditing(null);
      toast.success(editing ? "規則已更新。" : "規則已建立。");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: TenantApprovalRuleRecord) => {
    setEditing(record);
    setForm(toFormState(record));
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleDisable = async (record: TenantApprovalRuleRecord) => {
    if (!client) return;
    if (!record.activeFlag) return;
    if (
      !window.confirm(
        `確定要停用規則「${ruleNameOf(record)}」？停用後新預訂不再觸發此規則。`,
      )
    ) {
      return;
    }

    try {
      await client.disableApprovalRule(record.ruleId);
      await reload();
      if (editing?.ruleId === record.ruleId) {
        handleCancelEdit();
      }
      toast.success("規則已停用。");
    } catch (disableError) {
      toast.error(toErrorMessage(disableError));
    }
  };

  const handleMove = async (
    record: TenantApprovalRuleRecord,
    direction: "up" | "down",
  ) => {
    if (!client) return;
    const ordered = sortedRules.filter((r) => r.activeFlag);
    const idx = ordered.findIndex((r) => r.ruleId === record.ruleId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    const next = [...ordered];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];

    setReordering(true);
    try {
      await client.reorderApprovalRules({
        orderedRuleIds: next.map((r) => r.ruleId),
      });
      await reload();
      toast.success("已重新排序。");
    } catch (reorderError) {
      toast.error(toErrorMessage(reorderError));
    } finally {
      setReordering(false);
    }
  };

  const addCondition = () =>
    setForm((current) => ({
      ...current,
      conditions: [...current.conditions, { ...EMPTY_CONDITION }],
    }));

  const removeCondition = (idx: number) =>
    setForm((current) => ({
      ...current,
      conditions: current.conditions.filter((_, i) => i !== idx),
    }));

  const updateCondition = (idx: number, patch: Partial<ConditionDraft>) =>
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    }));

  const addApprover = () =>
    setForm((current) => ({
      ...current,
      approvers: [...current.approvers, { ...EMPTY_APPROVER }],
    }));

  const removeApprover = (idx: number) =>
    setForm((current) => ({
      ...current,
      approvers: current.approvers.filter((_, i) => i !== idx),
    }));

  const updateApprover = (idx: number, patch: Partial<PrincipalDraft>) =>
    setForm((current) => ({
      ...current,
      approvers: current.approvers.map((a, i) =>
        i === idx ? { ...a, ...patch } : a,
      ),
    }));

  const handleDryRun = async () => {
    if (!client) return;
    setDryRunRunning(true);
    try {
      const command: EvaluateTenantApprovalRuleCommand = {
        subject: {
          subjectType: "booking",
          bookingId: null,
          draftId: `dry-run-${Date.now()}`,
          operation: "dry_run",
        },
        inputSnapshot: {
          costCenterCode: dryRunForm.costCenterCode.trim() || null,
          businessDispatchSubtype:
            dryRunForm.businessDispatchSubtype.trim() || null,
          reservationWindowStart:
            dryRunForm.reservationWindowStart.trim() || null,
          reservationWindowEnd: null,
          passengerId: null,
          passengerRole: dryRunForm.passengerRole.trim() || null,
          amountMinor: dryRunForm.amountMinor.trim()
            ? Number(dryRunForm.amountMinor)
            : null,
          currency: dryRunForm.amountMinor.trim() ? "TWD" : null,
          vehiclePreference: dryRunForm.vehiclePreference.trim() || null,
          partnerEntrySlug: null,
          eligibilityVerificationId: null,
          signoffRequired: null,
          expenseProofRequired: null,
        },
      };
      const result = await client.evaluateApprovalRules(command);
      setDryRunResult(result);
      toast.success(`Dry-run 結果：${result.outcome.decision}`);
    } catch (dryRunError) {
      setDryRunResult(null);
      toast.error(toErrorMessage(dryRunError));
    } finally {
      setDryRunRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>審批規則目錄</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              顯示停用中
            </label>
            <div className="ml-auto text-xs text-muted-foreground">
              {loading ? "載入中…" : `共 ${visibleRules.length} 筆`}
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">優先序</TableHead>
                  <TableHead>規則</TableHead>
                  <TableHead>動作</TableHead>
                  <TableHead>條件數</TableHead>
                  <TableHead>審批人數</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">動作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRules.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground"
                    >
                      尚無規則。
                    </TableCell>
                  </TableRow>
                )}
                {visibleRules.map((record, idx) => (
                  <TableRow key={record.ruleId}>
                    <TableCell className="font-mono text-sm">
                      <div>{record.priority}</div>
                      {record.activeFlag && (
                        <div className="mt-1 flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={idx === 0 || reordering}
                            onClick={() => void handleMove(record, "up")}
                            aria-label="上移"
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={
                              idx === visibleRules.length - 1 || reordering
                            }
                            onClick={() => void handleMove(record, "down")}
                            aria-label="下移"
                          >
                            ↓
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{ruleNameOf(record)}</div>
                      {record.description && (
                        <div className="text-xs text-muted-foreground">
                          {record.description}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(record.updatedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.action}</Badge>
                      {record.action === "require_approval" &&
                        record.approvalMode && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {record.approvalMode}
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.conditions.length}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.approvers.length}
                    </TableCell>
                    <TableCell>
                      {record.activeFlag ? (
                        <Badge variant="default">啟用</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-rose-600">
                          停用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                        >
                          編輯
                        </Button>
                        {record.activeFlag && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDisable(record)}
                          >
                            停用
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {editing
              ? `編輯規則 ${ruleNameOf(editing)}`
              : "新增審批規則"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-name">規則名稱 *</Label>
                <Input
                  id="rule-name"
                  value={form.ruleName}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, ruleName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-priority">優先序 (數字小者先評估)</Label>
                <Input
                  id="rule-priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, priority: event.target.value }))
                  }
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="rule-desc">說明</Label>
                <Input
                  id="rule-desc"
                  value={form.description}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-action">動作</Label>
                <Select
                  value={form.action}
                  onValueChange={(value) =>
                    setForm((c) => ({
                      ...c,
                      action: value as TenantApprovalRuleAction,
                    }))
                  }
                >
                  <SelectTrigger id="rule-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.action === "require_approval" && (
                <div className="space-y-2">
                  <Label htmlFor="rule-mode">審批模式</Label>
                  <Select
                    value={form.approvalMode}
                    onValueChange={(value) =>
                      setForm((c) => ({
                        ...c,
                        approvalMode: value as TenantApprovalMode,
                      }))
                    }
                  >
                    <SelectTrigger id="rule-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVAL_MODES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rule-eff-from">生效起 (ISO datetime, 可空)</Label>
                <Input
                  id="rule-eff-from"
                  value={form.effectiveFrom}
                  onChange={(event) =>
                    setForm((c) => ({
                      ...c,
                      effectiveFrom: event.target.value,
                    }))
                  }
                  placeholder="2026-06-01T00:00:00Z"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-eff-until">生效迄 (ISO datetime, 可空)</Label>
                <Input
                  id="rule-eff-until"
                  value={form.effectiveUntil}
                  onChange={(event) =>
                    setForm((c) => ({
                      ...c,
                      effectiveUntil: event.target.value,
                    }))
                  }
                  placeholder="2026-12-31T23:59:59Z"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-timeout">
                  超時 (小時, 留空 = 預設 24h)
                </Label>
                <Input
                  id="rule-timeout"
                  value={form.timeoutHoursOverride}
                  onChange={(event) =>
                    setForm((c) => ({
                      ...c,
                      timeoutHoursOverride: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-fallback">超時後 fallback</Label>
                <Select
                  value={form.fallbackPolicyOverride}
                  onValueChange={(value) =>
                    setForm((c) => ({
                      ...c,
                      fallbackPolicyOverride: value as
                        | TenantApprovalFallbackPolicy
                        | "default",
                    }))
                  }
                >
                  <SelectTrigger id="rule-fallback">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">使用預設 (escalate_to_tenant_admin)</SelectItem>
                    {FALLBACK_POLICIES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium">條件 (AND)</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                >
                  + 新增條件
                </Button>
              </div>
              <div className="space-y-3">
                {form.conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 md:grid-cols-[2fr_1fr_2fr_auto]"
                  >
                    <Select
                      value={cond.field}
                      onValueChange={(value) =>
                        updateCondition(idx, { field: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_FIELDS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="font-mono text-xs">
                              {opt.value}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={cond.op}
                      onValueChange={(value) =>
                        updateCondition(idx, {
                          op: value as TenantApprovalRuleConditionOperator,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={cond.value}
                      onChange={(event) =>
                        updateCondition(idx, { value: event.target.value })
                      }
                      placeholder={
                        cond.op === "in" || cond.op === "not_in"
                          ? "value1, value2"
                          : cond.op === "exists"
                            ? "true / false"
                            : "value"
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(idx)}
                      disabled={form.conditions.length === 1}
                    >
                      移除
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium">審批人</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addApprover}
                >
                  + 新增審批人
                </Button>
              </div>
              <div className="space-y-3">
                {form.approvers.map((appr, idx) => {
                  const kindMeta = PRINCIPAL_KINDS.find(
                    (k) => k.value === appr.kind,
                  );
                  const refRequired =
                    appr.kind === "tenant_user" ||
                    appr.kind === "tenant_role" ||
                    appr.kind === "cost_center_owner";
                  return (
                    <div
                      key={idx}
                      className="grid gap-2 md:grid-cols-[2fr_2fr_2fr_auto]"
                    >
                      <Select
                        value={appr.kind}
                        onValueChange={(value) =>
                          updateApprover(idx, {
                            kind: value as TenantPrincipalKind,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRINCIPAL_KINDS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={appr.ref}
                        onChange={(event) =>
                          updateApprover(idx, { ref: event.target.value })
                        }
                        disabled={!refRequired}
                        placeholder={kindMeta?.hint ?? ""}
                      />
                      <Input
                        value={appr.displayName}
                        onChange={(event) =>
                          updateApprover(idx, {
                            displayName: event.target.value,
                          })
                        }
                        placeholder="顯示名稱 (選填)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(idx)}
                        disabled={form.approvers.length === 1}
                      >
                        移除
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <div className="text-sm font-medium">啟用中</div>
                <div className="text-xs text-muted-foreground">
                  停用後評估器不再考慮此規則。
                </div>
              </div>
              <Switch
                checked={form.activeFlag}
                onCheckedChange={(value) =>
                  setForm((c) => ({ ...c, activeFlag: value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  取消編輯
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "儲存中…" : editing ? "更新" : "建立"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dry-Run 評估</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            模擬一筆預訂跑過所有啟用中規則。不會建立預訂、不會送審。
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dry-cc">成本中心代碼</Label>
              <Input
                id="dry-cc"
                value={dryRunForm.costCenterCode}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    costCenterCode: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dry-subtype">派車型態</Label>
              <Input
                id="dry-subtype"
                value={dryRunForm.businessDispatchSubtype}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    businessDispatchSubtype: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dry-amount">金額 (minor units)</Label>
              <Input
                id="dry-amount"
                value={dryRunForm.amountMinor}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    amountMinor: event.target.value,
                  }))
                }
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dry-window">預約起始時間 (ISO)</Label>
              <Input
                id="dry-window"
                value={dryRunForm.reservationWindowStart}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    reservationWindowStart: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dry-role">乘客角色</Label>
              <Input
                id="dry-role"
                value={dryRunForm.passengerRole}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    passengerRole: event.target.value,
                  }))
                }
                placeholder="例如：manager / passenger"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dry-vehicle">車型偏好</Label>
              <Input
                id="dry-vehicle"
                value={dryRunForm.vehiclePreference}
                onChange={(event) =>
                  setDryRunForm((c) => ({
                    ...c,
                    vehiclePreference: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDryRunForm(EMPTY_DRY_RUN);
                setDryRunResult(null);
              }}
              disabled={dryRunRunning}
            >
              重置
            </Button>
            <Button
              type="button"
              onClick={() => void handleDryRun()}
              disabled={dryRunRunning}
            >
              {dryRunRunning ? "評估中…" : "執行 Dry-Run"}
            </Button>
          </div>
          {dryRunResult && (
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center gap-3">
                <Badge
                  variant={
                    dryRunResult.outcome.decision === "block"
                      ? "destructive"
                      : dryRunResult.outcome.decision === "allow"
                        ? "default"
                        : "secondary"
                  }
                >
                  decision: {dryRunResult.outcome.decision}
                </Badge>
                {dryRunResult.outcome.approvalRequired && (
                  <Badge variant="outline">需審批</Badge>
                )}
                {dryRunResult.outcome.blocked && (
                  <Badge variant="destructive">已封鎖</Badge>
                )}
              </div>
              {dryRunResult.outcome.warnings.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium">警示</div>
                  <ul className="mt-1 space-y-1 text-sm text-amber-700">
                    {dryRunResult.outcome.warnings.map((w, i) => (
                      <li key={i}>
                        [{w.source}] {w.code}
                        {w.ruleId ? ` — rule ${w.ruleId}` : ""}: {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="text-sm font-medium">命中規則</div>
                {dryRunResult.matchedRules.length === 0 ? (
                  <div className="text-sm text-muted-foreground">無命中。</div>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {dryRunResult.matchedRules.map((r) => (
                      <li
                        key={r.ruleId}
                        className="rounded-md border bg-muted/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">priority {r.priority}</Badge>
                          <span className="font-medium">{r.ruleName}</span>
                          <Badge variant="outline">{r.action}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.matchedConditions.length} 個條件命中 ·{" "}
                          {r.approvers.length} 個審批人
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {dryRunResult.approvalPlan && (
                <div className="mt-3">
                  <div className="text-sm font-medium">審批計畫</div>
                  <div className="text-xs text-muted-foreground">
                    模式 {dryRunResult.approvalPlan.approvalMode} · 超時{" "}
                    {dryRunResult.approvalPlan.timeoutHours}h · fallback{" "}
                    {dryRunResult.approvalPlan.fallbackPolicy}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
