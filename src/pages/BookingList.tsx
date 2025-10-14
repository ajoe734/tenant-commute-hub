import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Calendar, MapPin, Clock, User, Edit, Trash2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BookingList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bookings = [
    {
      id: "BK-2024-0847",
      date: "2024-10-15",
      time: "14:30",
      passenger: "John Chen",
      department: "Sales",
      route: "Office HQ → Airport Terminal 3",
      distance: "42 km",
      status: "scheduled",
      vehicle: "Sedan",
      cost: "$85",
      eta: "14:20"
    },
    {
      id: "BK-2024-0846",
      date: "2024-10-15",
      time: "10:00",
      passenger: "Sarah Lin",
      department: "Marketing",
      route: "Convention Center → Hotel Downtown",
      distance: "8 km",
      status: "completed",
      vehicle: "SUV",
      cost: "$35",
      eta: "-"
    },
    {
      id: "BK-2024-0845",
      date: "2024-10-15",
      time: "08:15",
      passenger: "Michael Wang",
      department: "Engineering",
      route: "Residential Area → Office Park",
      distance: "15 km",
      status: "in-progress",
      vehicle: "Sedan",
      cost: "$42",
      eta: "5 min"
    },
    {
      id: "BK-2024-0844",
      date: "2024-10-14",
      time: "18:30",
      passenger: "Emily Zhou",
      department: "HR",
      route: "Office Tower → Train Station",
      distance: "12 km",
      status: "completed",
      vehicle: "Sedan",
      cost: "$38",
      eta: "-"
    },
    {
      id: "BK-2024-0843",
      date: "2024-10-14",
      time: "15:00",
      passenger: "David Liu",
      department: "Finance",
      route: "Client Office → Company HQ",
      distance: "25 km",
      status: "completed",
      vehicle: "SUV",
      cost: "$68",
      eta: "-"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Scheduled", variant: "default" },
      "in-progress": { label: "In Progress", variant: "secondary" },
      completed: { label: "Completed", variant: "outline" },
      cancelled: { label: "Cancelled", variant: "destructive" }
    };
    
    const variant = variants[status] || variants.scheduled;
    return <Badge variant={variant.variant}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Booking Management</h2>
          <p className="text-muted-foreground">View, edit, and track all your bookings</p>
        </div>
        <Button onClick={() => navigate("/bookings/new")} className="bg-gradient-primary shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>Manage and track your transportation requests</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, passenger, or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {booking.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {booking.time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {booking.passenger}
                        </span>
                        <span className="text-xs text-muted-foreground">{booking.department}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 text-sm max-w-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{booking.route}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{booking.distance}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      {booking.eta !== "-" ? (
                        <span className="text-sm font-medium text-primary">{booking.eta}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{booking.cost}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingList;
