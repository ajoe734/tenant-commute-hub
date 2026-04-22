import { useEffect, useMemo, useState } from "react";
import type {
  GenerateTenantInvoiceCommand,
  TenantBillingProfile,
  TenantInvoiceRecord,
  UpdateTenantBillingProfileCommand,
} from "@drts/contracts";
import { CreditCard, Download, FileSpreadsheet, ReceiptText } from "lucide-react";
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
import { formatDate, formatDateTime, formatMoney, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface BillingFormState {
  invoiceTitle: string;
  taxId: string;
  address: string;
  contactName: string;
  email: string;
}

interface InvoiceRangeForm {
  periodStart: string;
  periodEnd: string;
}

const EMPTY_BILLING_FORM: BillingFormState = {
  invoiceTitle: "",
  taxId: "",
  address: "",
  contactName: "",
  email: "",
};

function toBillingForm(profile: TenantBillingProfile): BillingFormState {
  return {
    invoiceTitle: profile.invoiceTitle,
    taxId: profile.taxId ?? "",
    address: profile.address ?? "",
    contactName: profile.contactName ?? "",
    email: profile.email,
  };
}

function firstDayOfPreviousMonth(): string {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

function lastDayOfPreviousMonth(): string {
  const date = new Date();
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

export default function BillingManagement() {
  const { client, profile } = useAuth();
  const [billingProfile, setBillingProfile] =
    useState<TenantBillingProfile | null>(null);
  const [invoices, setInvoices] = useState<TenantInvoiceRecord[]>([]);
  const [billingForm, setBillingForm] =
    useState<BillingFormState>(EMPTY_BILLING_FORM);
  const [invoiceRange, setInvoiceRange] = useState<InvoiceRangeForm>({
    periodStart: firstDayOfPreviousMonth(),
    periodEnd: lastDayOfPreviousMonth(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedInvoices = useMemo(
    () =>
      [...invoices].sort((left, right) =>
        right.periodEnd.localeCompare(left.periodEnd),
      ),
    [invoices],
  );

  const stats = useMemo(() => {
    const issuedMinor = orderedInvoices.reduce(
      (sum, invoice) => sum + invoice.amount.amountMinor,
      0,
    );
    const paidMinor = orderedInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.amount.amountMinor, 0);
    const outstandingMinor = orderedInvoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce((sum, invoice) => sum + invoice.amount.amountMinor, 0);

    return {
      issuedMinor,
      paidMinor,
      outstandingMinor,
      currency: orderedInvoices[0]?.amount.currency ?? "TWD",
    };
  }, [orderedInvoices]);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [nextProfile, nextInvoices] = await Promise.all([
          client.getBillingProfile(),
          client.listInvoices(),
        ]);
        if (!active) {
          return;
        }
        setBillingProfile(nextProfile as TenantBillingProfile);
        setBillingForm(toBillingForm(nextProfile as TenantBillingProfile));
        setInvoices(nextInvoices);
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

  const refreshData = async () => {
    if (!client) {
      return;
    }
    const [nextProfile, nextInvoices] = await Promise.all([
      client.getBillingProfile(),
      client.listInvoices(),
    ]);
    setBillingProfile(nextProfile as TenantBillingProfile);
    setBillingForm(toBillingForm(nextProfile as TenantBillingProfile));
    setInvoices(nextInvoices);
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const command: UpdateTenantBillingProfileCommand = {
        invoiceTitle: billingForm.invoiceTitle.trim(),
        email: billingForm.email.trim(),
        ...(billingForm.taxId.trim() ? { taxId: billingForm.taxId.trim() } : {}),
        ...(billingForm.address.trim()
          ? { address: billingForm.address.trim() }
          : {}),
        ...(billingForm.contactName.trim()
          ? { contactName: billingForm.contactName.trim() }
          : {}),
      };
      const nextProfile = await client.post<TenantBillingProfile>(
        "/api/tenant/billing/profile",
        { body: command },
      );
      setBillingProfile(nextProfile);
      setBillingForm(toBillingForm(nextProfile));
      toast.success("Billing profile updated.");
    } catch (submitError) {
      const message = toErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || !profile?.tenant_id) {
      return;
    }

    setSaving(true);
    try {
      const command: GenerateTenantInvoiceCommand = {
        tenantId: profile.tenant_id,
        periodStart: new Date(`${invoiceRange.periodStart}T00:00:00.000Z`).toISOString(),
        periodEnd: new Date(`${invoiceRange.periodEnd}T23:59:59.999Z`).toISOString(),
      };
      await client.post<TenantInvoiceRecord>("/api/tenant/invoices/generate", {
        body: command,
      });
      await refreshData();
      toast.success("Invoice generated or returned from existing authority record.");
    } catch (generateError) {
      const message = toErrorMessage(generateError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const formatMinorAmount = (amountMinor: number, currency: string) =>
    `${currency} ${(amountMinor / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Issued invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinorAmount(stats.issuedMinor, stats.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinorAmount(stats.paidMinor, stats.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinorAmount(stats.outstandingMinor, stats.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void handleProfileSubmit(event)}
          >
            <div className="space-y-2">
              <Label>Invoice title</Label>
              <Input
                value={billingForm.invoiceTitle}
                onChange={(event) =>
                  setBillingForm((current) => ({
                    ...current,
                    invoiceTitle: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Billing email</Label>
              <Input
                type="email"
                value={billingForm.email}
                onChange={(event) =>
                  setBillingForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input
                value={billingForm.taxId}
                onChange={(event) =>
                  setBillingForm((current) => ({
                    ...current,
                    taxId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input
                value={billingForm.contactName}
                onChange={(event) =>
                  setBillingForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Billing address</Label>
              <Textarea
                rows={3}
                value={billingForm.address}
                onChange={(event) =>
                  setBillingForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                <CreditCard className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save billing profile"}
              </Button>
            </div>
          </form>

          {billingProfile && (
            <p className="mt-4 text-sm text-muted-foreground">
              Last synced from authority: {formatDateTime(billingProfile.updatedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(event) => void handleGenerateInvoice(event)}
          >
            <div className="space-y-2">
              <Label>Period start</Label>
              <Input
                type="date"
                value={invoiceRange.periodStart}
                onChange={(event) =>
                  setInvoiceRange((current) => ({
                    ...current,
                    periodStart: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Period end</Label>
              <Input
                type="date"
                value={invoiceRange.periodEnd}
                onChange={(event) =>
                  setInvoiceRange((current) => ({
                    ...current,
                    periodEnd: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                <ReceiptText className="mr-2 h-4 w-4" />
                {saving ? "Generating..." : "Generate"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">載入中...</div>
          ) : orderedInvoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No tenant invoices have been issued yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Artifact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedInvoices.map((invoice) => (
                  <TableRow key={invoice.invoiceId}>
                    <TableCell className="font-medium">
                      {invoice.invoiceId}
                    </TableCell>
                    <TableCell>
                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </TableCell>
                    <TableCell>{formatMoney(invoice.amount)}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>{invoice.lines.length}</TableCell>
                    <TableCell>{formatDateTime(invoice.updatedAt)}</TableCell>
                    <TableCell>
                      {invoice.artifactUrl ? (
                        <a
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                          href={invoice.artifactUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <FileSpreadsheet className="h-4 w-4" />
                          Pending
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
