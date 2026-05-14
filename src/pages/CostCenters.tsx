import { useEffect, useMemo, useState } from "react";
import {
  type DisableTenantCostCenterCommand,
  type TenantCostCenterCoverageReport,
  type TenantCostCenterRecord,
  type UpsertTenantCostCenterCommand,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface CostCenterFormState {
  code: string;
  name: string;
  description: string;
  ownerUserId: string;
  ownerName: string;
  activeFlag: boolean;
}

const EMPTY_FORM: CostCenterFormState = {
  code: "",
  name: "",
  description: "",
  ownerUserId: "",
  ownerName: "",
  activeFlag: true,
};

function toFormState(record: TenantCostCenterRecord): CostCenterFormState {
  return {
    code: record.code,
    name: record.name,
    description: record.description ?? "",
    ownerUserId: record.ownerUserId ?? "",
    ownerName: record.ownerName ?? "",
    activeFlag: record.activeFlag,
  };
}

export default function CostCenters() {
  const { client } = useAuth();
  const [costCenters, setCostCenters] = useState<TenantCostCenterRecord[]>([]);
  const [coverage, setCoverage] = useState<
    TenantCostCenterCoverageReport | null
  >(null);
  const [form, setForm] = useState<CostCenterFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<TenantCostCenterRecord | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCostCenters = useMemo(
    () =>
      [...costCenters].sort((left, right) => {
        if (left.activeFlag !== right.activeFlag) {
          return left.activeFlag ? -1 : 1;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      }),
    [costCenters],
  );

  const filteredCostCenters = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return sortedCostCenters.filter((record) => {
      if (!showInactive && !record.activeFlag) {
        return false;
      }
      if (!trimmed) {
        return true;
      }
      return (
        record.code.toLowerCase().includes(trimmed) ||
        record.name.toLowerCase().includes(trimmed) ||
        (record.description?.toLowerCase().includes(trimmed) ?? false)
      );
    });
  }, [sortedCostCenters, showInactive, search]);

  const reload = async () => {
    if (!client) {
      return;
    }
    const [nextCostCenters, nextCoverage] = await Promise.all([
      client.listCostCenters(),
      client.getTenantCostCenterCoverageReport().catch(() => null),
    ]);
    setCostCenters(nextCostCenters);
    setCoverage(nextCoverage);
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [nextCostCenters, nextCoverage] = await Promise.all([
          client.listCostCenters(),
          client.getTenantCostCenterCoverageReport().catch(() => null),
        ]);
        if (!active) {
          return;
        }
        setCostCenters(nextCostCenters);
        setCoverage(nextCoverage);
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

    if (!form.code.trim() || !form.name.trim()) {
      toast.error("成本中心代碼與名稱為必填。");
      return;
    }

    setSaving(true);
    try {
      const command: UpsertTenantCostCenterCommand = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        ownerUserId: form.ownerUserId.trim() ? form.ownerUserId.trim() : null,
        ownerName: form.ownerName.trim() ? form.ownerName.trim() : null,
        activeFlag: form.activeFlag,
      };

      await client.upsertCostCenter(command);
      await reload();
      setForm(EMPTY_FORM);
      setEditing(null);
      toast.success(editing ? "成本中心已更新。" : "成本中心已建立。");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: TenantCostCenterRecord) => {
    setEditing(record);
    setForm(toFormState(record));
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleDisable = async (record: TenantCostCenterRecord) => {
    if (!client) {
      return;
    }
    if (!record.activeFlag) {
      return;
    }
    const reason = window.prompt(
      `停用成本中心「${record.code}」的原因（選填，例如「合併進其他部門」）：`,
      "",
    );
    if (reason === null) {
      // User cancelled
      return;
    }

    setDisabling(record.code);
    try {
      const command: DisableTenantCostCenterCommand = {
        code: record.code,
        reason: reason.trim() ? reason.trim() : null,
      };
      await client.disableCostCenter(command);
      await reload();
      if (editing?.code === record.code) {
        handleCancelEdit();
      }
      toast.success("成本中心已停用。");
    } catch (disableError) {
      toast.error(toErrorMessage(disableError));
    } finally {
      setDisabling(null);
    }
  };

  return (
    <div className="space-y-6">
      {coverage && (
        <Card>
          <CardHeader>
            <CardTitle>覆蓋率報告</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">總預訂數</div>
                <div className="text-2xl font-semibold">
                  {coverage.totalBookings}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">
                  已對應目錄
                </div>
                <div className="text-2xl font-semibold text-emerald-600">
                  {coverage.resolvedCount}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">
                  legacy free-text
                </div>
                <div className="text-2xl font-semibold text-amber-600">
                  {coverage.unresolvedCount}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">指向已停用</div>
                <div className="text-2xl font-semibold text-rose-600">
                  {coverage.disabledHits}
                </div>
              </div>
            </div>
            {coverage.unresolvedSamples.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                  最常見未對應字串 (top {coverage.unresolvedSamples.length})
                </div>
                <div className="space-y-1 text-sm">
                  {coverage.unresolvedSamples.map((sample) => (
                    <div
                      key={sample.rawCostCenter}
                      className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5"
                    >
                      <code className="text-xs">{sample.rawCostCenter}</code>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {sample.occurrences} 筆
                        </span>
                        {sample.suggestion && (
                          <Badge variant="outline" className="font-mono">
                            建議 → {sample.suggestion}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs text-muted-foreground">
              最後產生：{formatDateTime(coverage.generatedAt)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? `編輯成本中心 ${editing.code}` : "新增成本中心"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="space-y-2">
              <Label htmlFor="cc-code">成本中心代碼 *</Label>
              <Input
                id="cc-code"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                disabled={Boolean(editing)}
                required
                placeholder="例如：CC-FIN-04"
              />
              <p className="text-xs text-muted-foreground">
                大寫英數與連字號；建立後不可變更。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-name">顯示名稱 *</Label>
              <Input
                id="cc-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                placeholder="例如：財務處"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cc-description">說明</Label>
              <Textarea
                id="cc-description"
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-owner-user">負責人 user id</Label>
              <Input
                id="cc-owner-user"
                value={form.ownerUserId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ownerUserId: event.target.value,
                  }))
                }
                placeholder="tenant-user-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-owner-name">負責人顯示名稱</Label>
              <Input
                id="cc-owner-name"
                value={form.ownerName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ownerName: event.target.value,
                  }))
                }
                placeholder="例如：王主管"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <div className="text-sm font-medium">啟用中</div>
                <div className="text-xs text-muted-foreground">
                  停用後新預訂無法引用此成本中心；既有預訂保留指向。
                </div>
              </div>
              <Switch
                checked={form.activeFlag}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, activeFlag: value }))
                }
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
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
          <CardTitle>成本中心目錄</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-sm"
              placeholder="搜尋代碼 / 名稱 / 說明"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              顯示停用中
            </label>
            <div className="ml-auto text-xs text-muted-foreground">
              {loading
                ? "載入中…"
                : `共 ${filteredCostCenters.length} 筆 / 總計 ${costCenters.length}`}
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代碼</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead>負責人</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>更新時間</TableHead>
                  <TableHead className="text-right">動作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCostCenters.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground"
                    >
                      尚無成本中心。
                    </TableCell>
                  </TableRow>
                )}
                {filteredCostCenters.map((record) => (
                  <TableRow key={record.code}>
                    <TableCell className="font-mono text-sm">
                      {record.code}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.name}</div>
                      {record.description && (
                        <div className="text-xs text-muted-foreground">
                          {record.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.ownerName ?? (
                        <span className="text-muted-foreground">未指派</span>
                      )}
                      {record.ownerUserId && (
                        <div className="text-xs text-muted-foreground">
                          {record.ownerUserId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.activeFlag ? (
                        <Badge variant="default">啟用</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-rose-600">
                          停用
                        </Badge>
                      )}
                      {!record.activeFlag && record.disabledReason && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {record.disabledReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(record.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          disabled={saving}
                        >
                          編輯
                        </Button>
                        {record.activeFlag && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDisable(record)}
                            disabled={
                              saving ||
                              disabling === record.code ||
                              !record.activeFlag
                            }
                          >
                            {disabling === record.code ? "停用中…" : "停用"}
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
    </div>
  );
}
