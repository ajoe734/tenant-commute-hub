import { useEffect, useMemo, useState } from "react";
import {
  TENANT_PASSENGER_MASTER_ROLES,
  type TenantPassengerMasterRole,
  type TenantPassengerQualityIssue,
  type TenantPassengerRecord,
  type UpsertTenantPassengerCommand,
} from "@drts/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PassengerFormState {
  passengerId?: string;
  fullName: string;
  employeeNo: string;
  departmentName: string;
  mobile: string;
  email: string;
  roles: TenantPassengerMasterRole[];
  activeFlag: boolean;
}

const PASSENGER_ROLE_LABELS: Record<TenantPassengerMasterRole, string> = {
  passenger: "乘客",
  employee: "員工",
  cardholder: "持卡人",
  vip: "VIP",
};

const PASSENGER_QUALITY_LABELS: Record<TenantPassengerQualityIssue, string> = {
  missing_contact: "缺少聯絡方式",
  missing_employee_no: "員工缺少員編",
  duplicate_employee_no: "員編重複",
};

const EMPTY_FORM: PassengerFormState = {
  fullName: "",
  employeeNo: "",
  departmentName: "",
  mobile: "",
  email: "",
  roles: ["passenger"],
  activeFlag: true,
};

function toFormState(passenger: TenantPassengerRecord): PassengerFormState {
  return {
    passengerId: passenger.passengerId,
    fullName: passenger.fullName,
    employeeNo: passenger.employeeNo ?? "",
    departmentName: passenger.departmentName ?? "",
    mobile: passenger.mobile ?? "",
    email: passenger.email ?? "",
    roles:
      passenger.roles && passenger.roles.length > 0
        ? [...passenger.roles]
        : ["passenger"],
    activeFlag: passenger.activeFlag,
  };
}

export default function PassengerManagement() {
  const { client } = useAuth();
  const [passengers, setPassengers] = useState<TenantPassengerRecord[]>([]);
  const [form, setForm] = useState<PassengerFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedPassengers = useMemo(
    () =>
      [...passengers].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [passengers],
  );

  const toggleRole = (role: TenantPassengerMasterRole, checked: boolean) => {
    setForm((current) => {
      const nextRoles = checked
        ? [...new Set([...current.roles, role])]
        : current.roles.filter((candidate) => candidate !== role);
      return {
        ...current,
        roles: nextRoles.length > 0 ? nextRoles : ["passenger"],
      };
    });
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const nextPassengers = await client.listPassengers();
        if (!active) {
          return;
        }
        setPassengers(nextPassengers);
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

    setSaving(true);
    try {
      const command: UpsertTenantPassengerCommand = {
        ...(form.passengerId ? { passengerId: form.passengerId } : {}),
        fullName: form.fullName.trim(),
        ...(form.employeeNo.trim() ? { employeeNo: form.employeeNo.trim() } : {}),
        ...(form.departmentName.trim()
          ? { departmentName: form.departmentName.trim() }
          : {}),
        ...(form.mobile.trim() ? { mobile: form.mobile.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        roles: form.roles,
        activeFlag: form.activeFlag,
      };
      await client.upsertPassenger(command);
      const refreshed = await client.listPassengers();
      setPassengers(refreshed);
      setForm(EMPTY_FORM);
      toast.success(form.passengerId ? "Passenger updated." : "Passenger created.");
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      toast.error(toErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (passenger: TenantPassengerRecord) => {
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      await client.upsertPassenger({
        passengerId: passenger.passengerId,
        fullName: passenger.fullName,
        employeeNo: passenger.employeeNo,
        departmentName: passenger.departmentName,
        mobile: passenger.mobile,
        email: passenger.email,
        roles: passenger.roles,
        activeFlag: false,
      });
      setPassengers(await client.listPassengers());
      toast.success("Passenger deactivated.");
    } catch (deactivateError) {
      toast.error(toErrorMessage(deactivateError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passenger Directory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Employee No</Label>
            <Input
              value={form.employeeNo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  employeeNo: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={form.departmentName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  departmentName: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Mobile</Label>
            <Input
              value={form.mobile}
              onChange={(event) =>
                setForm((current) => ({ ...current, mobile: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>治理角色</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {TENANT_PASSENGER_MASTER_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={form.roles.includes(role)}
                    onCheckedChange={(checked) =>
                      toggleRole(role, checked === true)
                    }
                  />
                  <span>{PASSENGER_ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit" disabled={saving}>
              {form.passengerId ? "Save Changes" : "Create Passenger"}
            </Button>
            {form.passengerId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(EMPTY_FORM)}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee No</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPassengers.map((passenger) => (
                <TableRow key={passenger.passengerId}>
                  <TableCell>{passenger.fullName}</TableCell>
                  <TableCell>{passenger.employeeNo ?? "—"}</TableCell>
                  <TableCell>{passenger.departmentName ?? "—"}</TableCell>
                  <TableCell>{passenger.mobile ?? "—"}</TableCell>
                  <TableCell>{passenger.email ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(passenger.roles && passenger.roles.length > 0
                        ? passenger.roles
                        : ["passenger"]
                      ).map((role) => (
                        <Badge key={role} variant="secondary">
                          {PASSENGER_ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {passenger.qualityIssues &&
                      passenger.qualityIssues.length > 0 ? (
                        passenger.qualityIssues.map((issue) => (
                          <Badge key={issue} variant="outline">
                            {PASSENGER_QUALITY_LABELS[issue]}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{passenger.activeFlag ? "Active" : "Inactive"}</TableCell>
                  <TableCell>{formatDateTime(passenger.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-primary hover:underline"
                        type="button"
                        onClick={() => setForm(toFormState(passenger))}
                      >
                        Edit
                      </button>
                      {passenger.activeFlag && (
                        <button
                          className="text-destructive hover:underline"
                          type="button"
                          onClick={() => void handleDeactivate(passenger)}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
