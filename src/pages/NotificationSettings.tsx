import { useEffect, useMemo, useState } from "react";
import type {
  NotificationRecord,
  TenantNotificationPreferences,
  TenantNotificationSubscription,
  UpdateTenantNotificationsCommand,
} from "@drts/contracts";
import { Bell, Mail, RadioTower, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface SubscriptionTemplate {
  eventType: string;
  channel: TenantNotificationSubscription["channel"];
  label: string;
  description: string;
}

const DEFAULT_SUBSCRIPTIONS: SubscriptionTemplate[] = [
  {
    eventType: "booking.created",
    channel: "email",
    label: "Booking created email",
    description: "Notify tenant operators when a new booking is created.",
  },
  {
    eventType: "booking.cancelled",
    channel: "email",
    label: "Booking cancelled email",
    description: "Notify tenant operators when a booking is cancelled.",
  },
  {
    eventType: "booking.updated",
    channel: "ops_console",
    label: "Ops console updates",
    description: "Surface booking updates in the authority console feed.",
  },
  {
    eventType: "tenant.sla.threshold_breach",
    channel: "email",
    label: "SLA breach email",
    description: "Send email when tenant SLA thresholds are breached.",
  },
  {
    eventType: "tenant.webhook.test",
    channel: "webhook",
    label: "Webhook test events",
    description: "Allow authority-initiated webhook test events.",
  },
];

function keyOf(subscription: TenantNotificationSubscription): string {
  return `${subscription.eventType}:${subscription.channel}`;
}

function buildSubscriptions(
  current: TenantNotificationSubscription[],
): TenantNotificationSubscription[] {
  const merged = new Map(
    current.map((subscription) => [keyOf(subscription), subscription]),
  );

  for (const template of DEFAULT_SUBSCRIPTIONS) {
    if (!merged.has(`${template.eventType}:${template.channel}`)) {
      merged.set(`${template.eventType}:${template.channel}`, {
        eventType: template.eventType,
        channel: template.channel,
        enabled: template.channel !== "webhook",
      });
    }
  }

  return Array.from(merged.values());
}

function channelIcon(channel: TenantNotificationSubscription["channel"]) {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "webhook":
      return <Webhook className="h-4 w-4" />;
    case "ops_console":
      return <RadioTower className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

export default function NotificationSettings() {
  const { client } = useAuth();
  const [preferences, setPreferences] =
    useState<TenantNotificationPreferences | null>(null);
  const [subscriptions, setSubscriptions] = useState<
    TenantNotificationSubscription[]
  >([]);
  const [feed, setFeed] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descriptions = useMemo(
    () =>
      new Map(
        DEFAULT_SUBSCRIPTIONS.map((entry) => [
          `${entry.eventType}:${entry.channel}`,
          entry,
        ]),
      ),
    [],
  );

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [nextPreferences, nextFeed] = await Promise.all([
          client.getNotificationPreferences(),
          client.listTenantNotificationFeed(),
        ]);
        if (!active) {
          return;
        }
        setPreferences(nextPreferences as TenantNotificationPreferences);
        setSubscriptions(
          buildSubscriptions(
            (nextPreferences as TenantNotificationPreferences).subscriptions,
          ),
        );
        setFeed(nextFeed);
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

  const handleSave = async () => {
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const command: UpdateTenantNotificationsCommand = {
        subscriptions,
      };
      await client.updateNotifications(command);
      const nextPreferences = await client.getNotificationPreferences();
      setPreferences(nextPreferences as TenantNotificationPreferences);
      setSubscriptions(
        buildSubscriptions(
          (nextPreferences as TenantNotificationPreferences).subscriptions,
        ),
      );
      toast.success("Notification preferences updated.");
    } catch (saveError) {
      const message = toErrorMessage(saveError);
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
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : (
            subscriptions.map((subscription) => {
              const descriptor = descriptions.get(keyOf(subscription));
              return (
                <div
                  key={keyOf(subscription)}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      {channelIcon(subscription.channel)}
                      <span>{descriptor?.label ?? keyOf(subscription)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {descriptor?.description ??
                        `${subscription.eventType} via ${subscription.channel}`}
                    </div>
                  </div>
                  <Switch
                    checked={subscription.enabled}
                    onCheckedChange={(enabled) =>
                      setSubscriptions((current) =>
                        current.map((candidate) =>
                          keyOf(candidate) === keyOf(subscription)
                            ? { ...candidate, enabled }
                            : candidate,
                        ),
                      )
                    }
                  />
                </div>
              );
            })
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="text-sm text-muted-foreground">
              Authority last updated: {formatDateTime(preferences?.updatedAt)}
            </div>
            <Button type="button" disabled={saving || loading} onClick={() => void handleSave()}>
              {saving ? "Saving..." : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authority Notification Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : feed.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No authority notifications recorded for this tenant.
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((notification) => (
                <div
                  key={notification.notificationId}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {notification.message}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{notification.channel}</div>
                      <div>{notification.status}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {notification.createdAt
                      ? formatDateTime(notification.createdAt)
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
