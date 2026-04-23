import { useEffect, useState } from "react";
import type { TenantSlaProfile, UpdateTenantSlaProfileCommand } from "@drts/contracts";
import { Gauge, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface SlaFormState {
  waitThresholdMin: string;
  arrivalThresholdMin: string;
  completionThresholdMin: string;
}

function toForm(profile: TenantSlaProfile): SlaFormState {
  return {
    waitThresholdMin: String(profile.waitThresholdMin),
    arrivalThresholdMin: String(profile.arrivalThresholdMin),
    completionThresholdMin: String(profile.completionThresholdMin),
  };
}

export default function SlaManagement() {
  const { client } = useAuth();
  const [profile, setProfile] = useState<TenantSlaProfile | null>(null);
  const [form, setForm] = useState<SlaFormState>({
    waitThresholdMin: "",
    arrivalThresholdMin: "",
    completionThresholdMin: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const nextProfile = (await client.getSlaProfile()) as TenantSlaProfile;
        if (!active) {
          return;
        }
        setProfile(nextProfile);
        setForm(toForm(nextProfile));
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
      const command: UpdateTenantSlaProfileCommand = {
        waitThresholdMin: Number(form.waitThresholdMin),
        arrivalThresholdMin: Number(form.arrivalThresholdMin),
        completionThresholdMin: Number(form.completionThresholdMin),
      };
      const nextProfile = (await client.updateSlaProfile(
        command,
      )) as TenantSlaProfile;
      setProfile(nextProfile);
      setForm(toForm(nextProfile));
      toast.success("SLA profile updated.");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    {
      label: "Queue wait",
      value: `${profile?.waitThresholdMin ?? "—"} min`,
      icon: TimerReset,
    },
    {
      label: "Driver arrival",
      value: `${profile?.arrivalThresholdMin ?? "—"} min`,
      icon: Gauge,
    },
    {
      label: "Completion",
      value: `${profile?.completionThresholdMin ?? "—"} min`,
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold">{item.value}</div>
              <item.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant SLA Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : (
            <form
              className="grid gap-4 md:grid-cols-3"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="space-y-2">
                <Label>Max wait minutes</Label>
                <Input
                  min="1"
                  type="number"
                  value={form.waitThresholdMin}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      waitThresholdMin: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Max arrival minutes</Label>
                <Input
                  min="1"
                  type="number"
                  value={form.arrivalThresholdMin}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      arrivalThresholdMin: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Max completion minutes</Label>
                <Input
                  min="1"
                  type="number"
                  value={form.completionThresholdMin}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      completionThresholdMin: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save SLA profile"}
                </Button>
              </div>
            </form>
          )}

          <div className="text-sm text-muted-foreground">
            Authority last updated: {formatDateTime(profile?.updatedAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
