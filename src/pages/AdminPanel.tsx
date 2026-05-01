import { useEffect, useMemo, useState } from "react";
import type {
  CreateTenantUserCommand,
  PlatformAdminTenantRecord,
  TenantRoleCatalogRecord,
  TenantUserRoleRecord,
  TenantUserRoleStatus,
  UpdateTenantRoleCommand,
} from "@drts/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { roleCodeToLabel } from "@/lib/drtsApi";
import { toast } from "sonner";

interface UserDraft {
  roleCode: string;
  status: TenantUserRoleStatus;
}

interface InviteFormState {
  email: string;
  displayName: string;
  roleCode: string;
}

const STATUSES: TenantUserRoleStatus[] = ["invited", "active", "suspended"];

export default function AdminPanel() {
  const { client, profile } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<TenantUserRoleRecord[]>([]);
  const [roleCatalog, setRoleCatalog] = useState<TenantRoleCatalogRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [tenantProfile, setTenantProfile] =
    useState<PlatformAdminTenantRecord | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    displayName: "",
    roleCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLookup = useMemo(
    () =>
      new Map(
        roleCatalog.map((role) => [role.roleCode, role.displayName]),
      ),
    [roleCatalog],
  );

  const assignableRoles = useMemo(() => {
    const filtered = roleCatalog.filter((role) => role.assignable);
    return filtered.length > 0 ? filtered : roleCatalog;
  }, [roleCatalog]);

  useEffect(() => {
    if (!client || !isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [nextUsers, nextRoleCatalog, nextTenantProfile] = await Promise.all([
          client.listTenantUsers(),
          client.listTenantRoles(),
          profile?.tenant_id
            ? client.getPlatformTenant(profile.tenant_id)
            : Promise.resolve(null),
        ]);
        if (!active) {
          return;
        }
        setUsers(nextUsers);
        setRoleCatalog(nextRoleCatalog);
        setDrafts(
          Object.fromEntries(
            nextUsers.map((user) => [
              user.userId,
              {
                roleCode: user.roleCode,
                status: user.status,
              },
            ]),
          ),
        );
        setInviteForm((current) => ({
          ...current,
          roleCode: nextRoleCatalog[0]?.roleCode ?? current.roleCode,
        }));
        setTenantProfile(nextTenantProfile);
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
  }, [client, isAdmin, profile?.tenant_id]);

  const refreshUsers = async () => {
    if (!client) {
      return;
    }
    const [nextUsers, nextTenantProfile] = await Promise.all([
      client.listTenantUsers(),
      profile?.tenant_id
        ? client.getPlatformTenant(profile.tenant_id)
        : Promise.resolve(null),
    ]);
    setUsers(nextUsers);
    setTenantProfile(nextTenantProfile);
    setDrafts(
      Object.fromEntries(
        nextUsers.map((user) => [
          user.userId,
          {
            roleCode: user.roleCode,
            status: user.status,
          },
        ]),
      ),
    );
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const command: CreateTenantUserCommand = {
        email: inviteForm.email.trim(),
        displayName: inviteForm.displayName.trim(),
        roleCode: inviteForm.roleCode,
      };
      await client.createTenantUser(command);
      await refreshUsers();
      setInviteForm({
        email: "",
        displayName: "",
        roleCode: assignableRoles[0]?.roleCode ?? "",
      });
      toast.success("Tenant user invited.");
    } catch (inviteError) {
      const message = toErrorMessage(inviteError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    if (!client) {
      return;
    }

    const draft = drafts[userId];
    if (!draft) {
      return;
    }

    setSaving(true);
    try {
      const command: UpdateTenantRoleCommand = {
        roleCode: draft.roleCode,
        status: draft.status,
      };
      await client.updateTenantRole(userId, command);
      await refreshUsers();
      toast.success("Tenant user updated.");
    } catch (updateError) {
      const message = toErrorMessage(updateError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Tenant admin access is required to manage users and role assignments.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tenant onboarding status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantProfile ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Rollout stage</div>
                  <div className="mt-2 font-medium">{tenantProfile.rollout.stage}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Integration mode</div>
                  <div className="mt-2 font-medium">
                    {tenantProfile.integrationPackage.mode}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Rollback plan</div>
                  <div className="mt-2 font-medium">
                    {tenantProfile.rollout.rollbackPrepared ? "Prepared" : "Pending"}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Billing baseline</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div>{tenantProfile.bootstrapDefaults.billingBaseline.invoiceTitle}</div>
                    <div>{tenantProfile.bootstrapDefaults.billingBaseline.contactName}</div>
                    <div>{tenantProfile.bootstrapDefaults.billingBaseline.email}</div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Default roles</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {tenantProfile.bootstrapDefaults.roleDefaults.map((role) => (
                      <span
                        key={role.roleCode}
                        className="rounded-full border px-3 py-1"
                      >
                        {role.displayName}
                        {role.required ? " · required" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                <div>Cutover owner: {tenantProfile.rollout.cutoverOwner ?? "—"}</div>
                <div>Rollback owner: {tenantProfile.rollout.rollbackOwner ?? "—"}</div>
                <div>Notes: {tenantProfile.rollout.notes ?? "—"}</div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Tenant onboarding profile is not available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Tenant User</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(event) => void handleInvite(event)}
          >
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={inviteForm.displayName}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.roleCode}
                onValueChange={(roleCode) =>
                  setInviteForm((current) => ({ ...current, roleCode }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.roleCode} value={role.roleCode}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={saving || !inviteForm.roleCode}>
                {saving ? "Inviting..." : "Invite user"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No tenant users are currently assigned.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const draft = drafts[user.userId] ?? {
                    roleCode: user.roleCode,
                    status: user.status,
                  };

                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        {user.displayName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {roleLookup.get(user.roleCode) ??
                          roleCodeToLabel(user.roleCode)}
                      </TableCell>
                      <TableCell>{user.status}</TableCell>
                      <TableCell>{formatDateTime(user.invitedAt)}</TableCell>
                      <TableCell>{formatDateTime(user.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[280px] items-center gap-2">
                          <Select
                            value={draft.roleCode}
                            onValueChange={(roleCode) =>
                              setDrafts((current) => ({
                                ...current,
                                [user.userId]: {
                                  ...draft,
                                  roleCode,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((role) => (
                                <SelectItem
                                  key={role.roleCode}
                                  value={role.roleCode}
                                >
                                  {role.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={draft.status}
                            onValueChange={(status) =>
                              setDrafts((current) => ({
                                ...current,
                                [user.userId]: {
                                  ...draft,
                                  status: status as TenantUserRoleStatus,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleUpdateUser(user.userId)}
                          >
                            Save
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
