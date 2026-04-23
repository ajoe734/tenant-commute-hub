import { useEffect, useState } from "react";
import type { CreateReportJobCommand, ReportJobRecord } from "@drts/contracts";
import { REPORT_OUTPUT_FORMATS } from "@drts/contracts";
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

const INITIAL_FORM: CreateReportJobCommand = {
  jobType: "tenant_usage_summary",
  format: "csv",
};

export default function ReportManagement() {
  const { client } = useAuth();
  const [jobs, setJobs] = useState<ReportJobRecord[]>([]);
  const [form, setForm] = useState<CreateReportJobCommand>(INITIAL_FORM);
  const [recipients, setRecipients] = useState("");
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
        const nextJobs = await client.listTenantReportJobs();
        if (!active) {
          return;
        }
        setJobs(nextJobs);
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
      await client.createTenantReportJob({
        ...form,
        ...(recipients.trim()
          ? { recipients: splitCommaSeparated(recipients) }
          : {}),
      });
      setJobs(await client.listTenantReportJobs());
      setForm(INITIAL_FORM);
      setRecipients("");
      toast.success("Report job queued.");
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      toast.error(toErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label>Job type</Label>
            <Input
              value={form.jobType}
              onChange={(event) =>
                setForm((current) => ({ ...current, jobType: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={form.format}
              onValueChange={(format) =>
                setForm((current) => ({
                  ...current,
                  format: format as CreateReportJobCommand["format"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_OUTPUT_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Recipients (comma-separated)</Label>
            <Textarea
              rows={2}
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              placeholder="ops@example.com, finance@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Submitting..." : "Queue Report Job"}
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Artifact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell className="font-medium">{job.jobId}</TableCell>
                  <TableCell>{job.jobType}</TableCell>
                  <TableCell>{job.format}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                  <TableCell>
                    {job.artifact ? (
                      <a
                        className="text-primary hover:underline"
                        href={job.artifact.downloadUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
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
