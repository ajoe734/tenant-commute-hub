import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL, roleCodeToLabel } from "@/lib/drtsApi";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";

interface DashboardSnapshot {
  apiStatus: "connected" | "disconnected";
  bookingCount: number;
  passengerCount: number;
  addressCount: number;
  reportCount: number;
  apiKeyCount: number;
  webhookCount: number;
  invoiceCount: number;
  lastAuditAt: string | null;
}

const INITIAL_SNAPSHOT: DashboardSnapshot = {
  apiStatus: "disconnected",
  bookingCount: 0,
  passengerCount: 0,
  addressCount: 0,
  reportCount: 0,
  apiKeyCount: 0,
  webhookCount: 0,
  invoiceCount: 0,
  lastAuditAt: null,
};

export default function Dashboard() {
  const { client, profile } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(INITIAL_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [
          identity,
          bookings,
          passengers,
          addresses,
          reports,
          apiKeys,
          webhooks,
          invoices,
          auditLogs,
        ] = await Promise.all([
          client.getIdentityContext(),
          client.listTenantBookings(),
          client.listPassengers(),
          client.listAddresses(),
          client.listTenantReportJobs(),
          client.listApiKeys(),
          client.listWebhooks(),
          client.listInvoices(),
          client.listTenantAuditLogs(),
        ]);

        if (!active) {
          return;
        }

        setSnapshot({
          apiStatus: identity ? "connected" : "disconnected",
          bookingCount: bookings.length,
          passengerCount: passengers.length,
          addressCount: addresses.length,
          reportCount: reports.length,
          apiKeyCount: apiKeys.length,
          webhookCount: webhooks.length,
          invoiceCount: invoices.length,
          lastAuditAt: auditLogs[0]?.createdAt ?? null,
        });
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

  const cards = [
    { label: "Bookings", value: snapshot.bookingCount, href: "/booking-list" },
    { label: "Passengers", value: snapshot.passengerCount, href: "/passengers" },
    { label: "Addresses", value: snapshot.addressCount, href: "/addresses" },
    { label: "Reports", value: snapshot.reportCount, href: "/reports" },
    { label: "API Keys", value: snapshot.apiKeyCount, href: "/api-keys" },
    { label: "Webhooks", value: snapshot.webhookCount, href: "/webhooks" },
    { label: "Invoices", value: snapshot.invoiceCount, href: "/billing" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Portal Overview</CardTitle>
          <CardDescription>
            API endpoint: {API_URL}. Signed in as{" "}
            {profile?.full_name ?? profile?.email ?? "Bootstrap User"} (
            {roleCodeToLabel(profile?.role_code ?? "tenant_admin")}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Link key={card.href} to={card.href}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle>{loading ? "…" : card.value}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <div>API status: {snapshot.apiStatus}</div>
            <div>Last audit event: {formatDateTime(snapshot.lastAuditAt)}</div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
