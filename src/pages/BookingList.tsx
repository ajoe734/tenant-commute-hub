import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BookingRecord, OwnedOrderStatus } from "@drts/contracts";
import { OWNED_ORDER_STATUSES } from "@drts/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDateTime, toErrorMessage } from "@/lib/formatting";
import { User, Car, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_PREF_MAP: Record<string, { label: string; icon: typeof User; colorClass: string }> = {
  human_driver: { label: "人類司機", icon: User, colorClass: "text-blue-600" },
  autonomous: { label: "自駕車", icon: Car, colorClass: "text-green-600" },
  no_preference: { label: "無偏好", icon: HelpCircle, colorClass: "text-muted-foreground" },
};

function VehiclePreferenceCell({ value }: { value: string | null }) {
  const entry = value ? VEHICLE_PREF_MAP[value] : null;
  if (!entry) return <span className="text-muted-foreground">—</span>;
  const Icon = entry.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1.5 ${entry.colorClass}`}>
            <Icon className="h-4 w-4" />
            <span className="text-sm">{entry.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>偏好用車：{entry.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function badgeVariant(status: OwnedOrderStatus) {
  if (status === "completed") {
    return "secondary";
  }
  if (status === "cancelled" || status === "dispatch_failed") {
    return "destructive";
  }
  if (status.includes("pending") || status.includes("required")) {
    return "outline";
  }
  return "default";
}

export default function BookingList() {
  const { client } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const nextBookings = await client.listTenantBookings();
        if (!active) {
          return;
        }
        setBookings(nextBookings);
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

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") {
      return bookings;
    }
    return bookings.filter((booking) => booking.orderStatus === statusFilter);
  }, [bookings, statusFilter]);

  const handleCancel = async (bookingId: string) => {
    if (!client) {
      return;
    }
    const reason = window.prompt("Cancel reason (optional):") ?? undefined;
    if (reason === null) {
      return;
    }

    try {
      await client.cancelTenantBooking(bookingId, {
        ...(reason ? { reason } : {}),
      });
      const nextBookings = await client.listTenantBookings();
      setBookings(nextBookings);
      toast.success("Booking cancelled.");
    } catch (cancelError) {
      toast.error(toErrorMessage(cancelError));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Booking List</CardTitle>
          <p className="text-sm text-muted-foreground">
            All booking reads and commands are routed through
            `/api/tenant/bookings`.
          </p>
        </div>
        <Button asChild>
          <Link to="/bookings/new">Create Booking</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Filter by order status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {OWNED_ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No bookings found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.bookingId}>
                  <TableCell className="font-medium">
                    <Link
                      className="text-primary hover:underline"
                      to={`/booking-list/${booking.bookingId}`}
                    >
                      {booking.bookingId}
                    </Link>
                  </TableCell>
                  <TableCell>{booking.businessDispatchSubtype}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant(booking.orderStatus)}>
                      {booking.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{booking.passenger.name}</TableCell>
                  <TableCell>{booking.pickup.address}</TableCell>
                  <TableCell>{booking.dropoff.address}</TableCell>
                  <TableCell>
                    {formatDateTime(booking.reservationWindowStart)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-primary hover:underline"
                        to={`/booking-list/${booking.bookingId}`}
                      >
                        Details
                      </Link>
                      {booking.orderStatus !== "completed" &&
                        booking.orderStatus !== "cancelled" && (
                          <button
                            className="text-destructive hover:underline"
                            type="button"
                            onClick={() => void handleCancel(booking.bookingId)}
                          >
                            Cancel
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
