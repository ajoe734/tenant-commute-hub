import { useEffect, useMemo, useState } from "react";
import type {
  IssueTenantApiKeyCommand,
  RotateTenantApiKeyCommand,
  TenantApiKeyIssued,
  TenantApiKeyRecord,
} from "@drts/contracts";
import { Copy, KeyRound, RefreshCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatDateTime,
  splitCommaSeparated,
  toDatetimeLocalValue,
  toErrorMessage,
} from "@/lib/formatting";
import { toast } from "sonner";

interface ApiKeyFormState {
  keyName: string;
  scopes: string;
  expiresAt: string;
}

const EMPTY_FORM: ApiKeyFormState = {
  keyName: "",
  scopes: "tenant:bookings:read, tenant:bookings:write",
  expiresAt: "",
};

function toIssueCommand(form: ApiKeyFormState): IssueTenantApiKeyCommand {
  return {
    keyName: form.keyName.trim(),
    scopes: splitCommaSeparated(form.scopes),
    ...(form.expiresAt
      ? { expiresAt: new Date(form.expiresAt).toISOString() }
      : {}),
  };
}

function toRotateForm(apiKey: TenantApiKeyRecord): ApiKeyFormState {
  return {
    keyName: apiKey.keyName,
    scopes: apiKey.scopes.join(", "),
    expiresAt: toDatetimeLocalValue(apiKey.expiresAt),
  };
}

async function copySecret(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("API key copied to clipboard.");
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

export default function ApiKeyManagement() {
  const { client } = useAuth();
  const [apiKeys, setApiKeys] = useState<TenantApiKeyRecord[]>([]);
  const [issueForm, setIssueForm] = useState<ApiKeyFormState>(EMPTY_FORM);
  const [rotateTarget, setRotateTarget] = useState<TenantApiKeyRecord | null>(
    null,
  );
  const [rotateForm, setRotateForm] = useState<ApiKeyFormState>(EMPTY_FORM);
  const [latestSecret, setLatestSecret] = useState<TenantApiKeyIssued | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedKeys = useMemo(
    () =>
      [...apiKeys].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    [apiKeys],
  );

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const nextKeys = await client.listApiKeys();
        if (!active) {
          return;
        }
        setApiKeys(nextKeys);
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

  const refreshKeys = async () => {
    if (!client) {
      return;
    }
    const nextKeys = await client.listApiKeys();
    setApiKeys(nextKeys);
  };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const issued = (await client.issueApiKey(
        toIssueCommand(issueForm),
      )) as TenantApiKeyIssued;
      await refreshKeys();
      setIssueForm(EMPTY_FORM);
      setLatestSecret(issued);
      toast.success("API key issued.");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || !rotateTarget) {
      return;
    }

    setSaving(true);
    try {
      const command: RotateTenantApiKeyCommand = {
        keyName: rotateForm.keyName.trim() || rotateTarget.keyName,
        scopes: splitCommaSeparated(rotateForm.scopes),
        expiresAt: rotateForm.expiresAt
          ? new Date(rotateForm.expiresAt).toISOString()
          : null,
      };
      const issued = (await client.rotateApiKey(
        rotateTarget.apiKeyId,
        command,
      )) as TenantApiKeyIssued;
      await refreshKeys();
      setLatestSecret(issued);
      setRotateTarget(null);
      setRotateForm(EMPTY_FORM);
      toast.success("API key rotated.");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (apiKeyId: string) => {
    if (!client || !window.confirm("Revoke this API key?")) {
      return;
    }

    setSaving(true);
    try {
      await client.revokeApiKey(apiKeyId);
      await refreshKeys();
      toast.success("API key revoked.");
    } catch (revokeError) {
      const message = toErrorMessage(revokeError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {latestSecret && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">
                    New plaintext key for {latestSecret.apiKey.keyName}
                  </div>
                  <code className="block break-all rounded bg-background px-3 py-2 text-sm">
                    {latestSecret.plaintextKey}
                  </code>
                  <p className="text-sm text-muted-foreground">
                    This value is only returned once by the authority BFF.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copySecret(latestSecret.plaintextKey)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void handleIssue(event)}
          >
            <div className="space-y-2">
              <Label>Key name</Label>
              <Input
                value={issueForm.keyName}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    keyName: event.target.value,
                  }))
                }
                placeholder="tenant-portal-production"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Expires at</Label>
              <Input
                type="datetime-local"
                value={issueForm.expiresAt}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Scopes (comma-separated)</Label>
              <Textarea
                rows={2}
                value={issueForm.scopes}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    scopes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                <KeyRound className="mr-2 h-4 w-4" />
                {saving ? "Issuing..." : "Issue API key"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rotateTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Rotate {rotateTarget.keyName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => void handleRotate(event)}
            >
              <div className="space-y-2">
                <Label>Key name</Label>
                <Input
                  value={rotateForm.keyName}
                  onChange={(event) =>
                    setRotateForm((current) => ({
                      ...current,
                      keyName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Expires at</Label>
                <Input
                  type="datetime-local"
                  value={rotateForm.expiresAt}
                  onChange={(event) =>
                    setRotateForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Scopes (comma-separated)</Label>
                <Textarea
                  rows={2}
                  value={rotateForm.scopes}
                  onChange={(event) =>
                    setRotateForm((current) => ({
                      ...current,
                      scopes: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {saving ? "Rotating..." : "Rotate key"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRotateTarget(null);
                    setRotateForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Issued Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : sortedKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No tenant API keys have been issued yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKeys.map((apiKey) => {
                  const revoked = Boolean(apiKey.revokedAt);
                  return (
                    <TableRow key={apiKey.apiKeyId}>
                      <TableCell className="font-medium">
                        {apiKey.keyName}
                      </TableCell>
                      <TableCell className="font-mono">
                        {apiKey.keyPrefix}…{apiKey.maskedSuffix}
                      </TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {apiKey.scopes.join(", ")}
                      </TableCell>
                      <TableCell>{formatDateTime(apiKey.lastUsedAt)}</TableCell>
                      <TableCell>{formatDateTime(apiKey.expiresAt)}</TableCell>
                      <TableCell>
                        {revoked ? (
                          <span className="inline-flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-4 w-4" />
                            Revoked
                          </span>
                        ) : (
                          "Active"
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(apiKey.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {!revoked && (
                            <>
                              <button
                                className="text-primary hover:underline"
                                type="button"
                                onClick={() => {
                                  setRotateTarget(apiKey);
                                  setRotateForm(toRotateForm(apiKey));
                                }}
                              >
                                Rotate
                              </button>
                              <button
                                className="text-destructive hover:underline"
                                type="button"
                                onClick={() => void handleRevoke(apiKey.apiKeyId)}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          {revoked && (
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          )}
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
