import { useEffect, useMemo, useState } from "react";
import type {
  CreateTenantWebhookEndpointCommand,
  NotificationRecord,
  TenantWebhookEndpoint,
  TenantWebhookEndpointStatus,
  UpdateTenantWebhookEndpointCommand,
  WebhookDeliveryRecord,
} from "@drts/contracts";
import { BellRing, RotateCw, ShieldCheck, Webhook } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, splitCommaSeparated, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface WebhookFormState {
  url: string;
  events: string;
  status: TenantWebhookEndpointStatus;
  secret: string;
}

interface RotateSecretFormState {
  secret: string;
  rotationReason: string;
}

const EMPTY_FORM: WebhookFormState = {
  url: "",
  events: "booking.created, booking.updated",
  status: "active",
  secret: "",
};

const EMPTY_ROTATE_FORM: RotateSecretFormState = {
  secret: "",
  rotationReason: "",
};

function toWebhookForm(webhook: TenantWebhookEndpoint): WebhookFormState {
  return {
    url: webhook.url,
    events: webhook.events.join(", "),
    status: webhook.status,
    secret: "",
  };
}

export default function WebhookManagement() {
  const { client } = useAuth();
  const [webhooks, setWebhooks] = useState<TenantWebhookEndpoint[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [rotatingWebhookId, setRotatingWebhookId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormState>(EMPTY_FORM);
  const [rotateForm, setRotateForm] =
    useState<RotateSecretFormState>(EMPTY_ROTATE_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWebhook = useMemo(
    () =>
      selectedWebhookId
        ? webhooks.find((webhook) => webhook.webhookId === selectedWebhookId) ?? null
        : null,
    [selectedWebhookId, webhooks],
  );

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [nextWebhooks, nextNotifications] = await Promise.all([
          client.listWebhooks(),
          client.listTenantNotificationFeed(),
        ]);
        if (!active) {
          return;
        }
        setWebhooks(nextWebhooks);
        setNotifications(nextNotifications);
        if (selectedWebhookId) {
          const nextDeliveries = await client.listWebhookDeliveries(selectedWebhookId);
          if (!active) {
            return;
          }
          setDeliveries(nextDeliveries);
        }
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
  }, [client, selectedWebhookId]);

  const refreshAll = async (webhookId?: string | null) => {
    if (!client) {
      return;
    }
    const [nextWebhooks, nextNotifications] = await Promise.all([
      client.listWebhooks(),
      client.listTenantNotificationFeed(),
    ]);
    setWebhooks(nextWebhooks);
    setNotifications(nextNotifications);

    const deliveryTarget = webhookId ?? selectedWebhookId;
    if (deliveryTarget) {
      setDeliveries(await client.listWebhookDeliveries(deliveryTarget));
    }
  };

  const handleCreateOrUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      if (editingWebhookId) {
        const command: UpdateTenantWebhookEndpointCommand = {
          url: form.url.trim(),
          events: splitCommaSeparated(form.events),
          status: form.status,
        };
        await client.updateWebhookEndpoint(editingWebhookId, command);
        toast.success("Webhook endpoint updated.");
      } else {
        const command: CreateTenantWebhookEndpointCommand = {
          url: form.url.trim(),
          secret: form.secret.trim(),
          events: splitCommaSeparated(form.events),
        };
        await client.createWebhookEndpoint(command);
        toast.success("Webhook endpoint created.");
      }

      await refreshAll(editingWebhookId);
      setEditingWebhookId(null);
      setForm(EMPTY_FORM);
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!client || !window.confirm("Delete this webhook endpoint?")) {
      return;
    }

    setSaving(true);
    try {
      await client.deleteWebhookEndpoint(webhookId);
      if (selectedWebhookId === webhookId) {
        setSelectedWebhookId(null);
        setDeliveries([]);
      }
      await refreshAll(null);
      toast.success("Webhook endpoint deleted.");
    } catch (deleteError) {
      const message = toErrorMessage(deleteError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (webhookId: string) => {
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const result = await client.post<{
        deliveryId: string | null;
        httpStatus: number;
        attempt?: number;
        nextAttemptAt?: string | null;
      }>("/api/tenant/webhooks/test", {
        body: { webhookId },
      });
      await refreshAll(webhookId);
      setSelectedWebhookId(webhookId);
      toast.success(
        `Test webhook queued with status ${result.httpStatus} and delivery ${result.deliveryId ?? "n/a"}.`,
      );
    } catch (testError) {
      const message = toErrorMessage(testError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRotateSecret = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || !rotatingWebhookId) {
      return;
    }

    setSaving(true);
    try {
      await client.post(`/api/tenant/webhooks/${rotatingWebhookId}/rotate-secret`, {
        body: {
          secret: rotateForm.secret.trim(),
          ...(rotateForm.rotationReason.trim()
            ? { rotationReason: rotateForm.rotationReason.trim() }
            : {}),
        },
      });
      await refreshAll(rotatingWebhookId);
      setRotateForm(EMPTY_ROTATE_FORM);
      setRotatingWebhookId(null);
      toast.success("Webhook secret rotated.");
    } catch (rotateError) {
      const message = toErrorMessage(rotateError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {editingWebhookId ? "Edit Webhook Endpoint" : "Create Webhook Endpoint"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void handleCreateOrUpdate(event)}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Webhook URL</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="https://consumer.example.com/webhook"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Events (comma-separated)</Label>
              <Textarea
                rows={2}
                value={form.events}
                onChange={(event) =>
                  setForm((current) => ({ ...current, events: event.target.value }))
                }
                required
              />
            </div>
            {!editingWebhookId && (
              <div className="space-y-2 md:col-span-2">
                <Label>Initial secret</Label>
                <Input
                  value={form.secret}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, secret: event.target.value }))
                  }
                  placeholder="whsec_..."
                  required
                />
              </div>
            )}
            {editingWebhookId && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((current) => ({
                      ...current,
                      status: status as TenantWebhookEndpointStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="test_pending">test_pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={saving}>
                <Webhook className="mr-2 h-4 w-4" />
                {saving
                  ? "Saving..."
                  : editingWebhookId
                    ? "Save endpoint"
                    : "Create endpoint"}
              </Button>
              {(editingWebhookId || form.url || form.events || form.secret) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingWebhookId(null);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {rotatingWebhookId && (
        <Card>
          <CardHeader>
            <CardTitle>Rotate Webhook Secret</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => void handleRotateSecret(event)}
            >
              <div className="space-y-2">
                <Label>New secret</Label>
                <Input
                  value={rotateForm.secret}
                  onChange={(event) =>
                    setRotateForm((current) => ({
                      ...current,
                      secret: event.target.value,
                    }))
                  }
                  placeholder="whsec_..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rotation reason</Label>
                <Input
                  value={rotateForm.rotationReason}
                  onChange={(event) =>
                    setRotateForm((current) => ({
                      ...current,
                      rotationReason: event.target.value,
                    }))
                  }
                  placeholder="credential_rollover"
                />
              </div>
              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  <RotateCw className="mr-2 h-4 w-4" />
                  {saving ? "Rotating..." : "Rotate secret"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRotatingWebhookId(null);
                    setRotateForm(EMPTY_ROTATE_FORM);
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
          <CardTitle>Authority Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : webhooks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No tenant webhook endpoints configured.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.webhookId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{webhook.webhookId}</div>
                        <div className="text-sm text-muted-foreground">
                          {webhook.url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{webhook.events.join(", ")}</TableCell>
                    <TableCell>{webhook.status}</TableCell>
                    <TableCell>
                      v{webhook.secretVersion} / {webhook.secretPreview}
                    </TableCell>
                    <TableCell>{formatDateTime(webhook.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <button
                          className="text-primary hover:underline"
                          type="button"
                          onClick={() => {
                            setEditingWebhookId(webhook.webhookId);
                            setForm(toWebhookForm(webhook));
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-primary hover:underline"
                          type="button"
                          onClick={() => {
                            setSelectedWebhookId(webhook.webhookId);
                            void refreshAll(webhook.webhookId);
                          }}
                        >
                          Deliveries
                        </button>
                        <button
                          className="text-primary hover:underline"
                          type="button"
                          onClick={() => void handleSendTest(webhook.webhookId)}
                        >
                          Test
                        </button>
                        <button
                          className="text-primary hover:underline"
                          type="button"
                          onClick={() => {
                            setRotatingWebhookId(webhook.webhookId);
                            setRotateForm(EMPTY_ROTATE_FORM);
                          }}
                        >
                          Rotate secret
                        </button>
                        <button
                          className="text-destructive hover:underline"
                          type="button"
                          onClick={() => void handleDelete(webhook.webhookId)}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Authority Notification Feed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No webhook-related authority notifications yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 8).map((notification) => (
                <div key={notification.notificationId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {notification.message}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{notification.channel}</div>
                      <div>{formatDateTime(notification.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWebhook && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Delivery Log for {selectedWebhook.webhookId}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No delivery attempts recorded for this endpoint.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.deliveryId}>
                      <TableCell className="font-medium">
                        {delivery.deliveryId}
                      </TableCell>
                      <TableCell>{delivery.eventType}</TableCell>
                      <TableCell>{delivery.status}</TableCell>
                      <TableCell>{delivery.attempt}</TableCell>
                      <TableCell>{delivery.httpStatus ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(delivery.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
