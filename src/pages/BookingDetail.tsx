import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookingRecord, UpdateTenantBookingCommand } from "@drts/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { User, Car, HelpCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_LABELS: Record<string, { label: string; icon: typeof User }> = {
  human_driver: { label: "人類司機", icon: User },
  autonomous: { label: "自駕車", icon: Car },
  no_preference: { label: "無偏好", icon: HelpCircle },
};

export default function BookingDetail() {
  const { bookingId = "" } = useParams();
  const { client } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !bookingId) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const nextBooking = (await client.getTenantBooking(
          bookingId,
        )) as BookingRecord;
        if (!active) {
          return;
        }
        setBooking(nextBooking);
        setNotes(nextBooking.notes ?? "");
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
  }, [bookingId, client]);

  const handleSave = async () => {
    if (!client || !booking) {
      return;
    }

    setSaving(true);
    try {
      const command: UpdateTenantBookingCommand = {
        notes: notes.trim() ? notes.trim() : null,
      };
      await client.updateTenantBooking(booking.bookingId, command);
      const refreshed = (await client.getTenantBooking(
        booking.bookingId,
      )) as BookingRecord;
      setBooking(refreshed);
      setNotes(refreshed.notes ?? "");
      toast.success("Booking updated.");
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!client || !booking) {
      return;
    }
    const reason = window.prompt("Cancel reason (optional):");
    if (reason === null) {
      return;
    }

    setSaving(true);
    try {
      await client.cancelTenantBooking(booking.bookingId, {
        ...(reason ? { reason } : {}),
      });
      const refreshed = (await client.getTenantBooking(
        booking.bookingId,
      )) as BookingRecord;
      setBooking(refreshed);
      setNotes(refreshed.notes ?? "");
      toast.success("Booking cancelled.");
    } catch (cancelError) {
      toast.error(toErrorMessage(cancelError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          載入中...
        </CardContent>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error ?? "Booking not found."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking {booking.bookingId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Order Status</div>
            <div className="font-medium">{booking.orderStatus}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Booking Window</div>
            <div className="font-medium">
              {formatDateTime(booking.reservationWindowStart)} →{" "}
              {formatDateTime(booking.reservationWindowEnd)}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Passenger</div>
            <div className="font-medium">{booking.passenger.name}</div>
            <div className="text-sm text-muted-foreground">
              {booking.passenger.phone}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Subtype</div>
            <div className="font-medium">{booking.businessDispatchSubtype}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Pickup</div>
            <div className="font-medium">{booking.pickup.address}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">Dropoff</div>
            <div className="font-medium">{booking.dropoff.address}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-notes">Notes</Label>
          <Textarea
            id="booking-notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Cost Center</Label>
            <Input value={booking.costCenter ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>偏好用車類型</Label>
            {(() => {
              const pref = booking.vehiclePreference;
              const entry = pref ? VEHICLE_LABELS[pref] : null;
              if (!entry) return <Input value={pref ?? "—"} readOnly />;
              const Icon = entry.icon;
              return (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Icon className="h-4 w-4" />
                  <span>{entry.label}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={() => void handleSave()} disabled={saving}>
            Save Notes
          </Button>
          {booking.orderStatus !== "completed" &&
            booking.orderStatus !== "cancelled" && (
              <Button
                variant="destructive"
                onClick={() => void handleCancel()}
                disabled={saving}
              >
                Cancel Booking
              </Button>
            )}
          <Button asChild variant="outline">
            <Link to="/booking-list">Back to list</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
