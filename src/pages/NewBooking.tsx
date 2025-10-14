import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, MapPin, User, Car, DollarSign, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NewBooking = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [tripType, setTripType] = useState("one-way");
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    toast.success("Booking created successfully!", {
      description: "Your trip has been scheduled. Booking ID: BK-2024-0848"
    });
    setTimeout(() => navigate("/bookings"), 1500);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Trip Type</Label>
              <RadioGroup value={tripType} onValueChange={setTripType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-way" id="one-way" />
                  <Label htmlFor="one-way" className="font-normal cursor-pointer">One-way trip</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="round-trip" id="round-trip" />
                  <Label htmlFor="round-trip" className="font-normal cursor-pointer">Round trip</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="font-normal cursor-pointer">Recurring schedule</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Pickup Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-time">Pickup Time</Label>
                <Input id="pickup-time" type="time" defaultValue="14:30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (est.)</Label>
                <Input id="duration" placeholder="30 min" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickup"
                  placeholder="Enter address or select from favorites"
                  className="pl-10"
                  defaultValue="Office HQ, 123 Business St."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoff">Drop-off Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dropoff"
                  placeholder="Enter destination address"
                  className="pl-10"
                  defaultValue="Airport Terminal 3"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Distance</span>
                <span className="font-medium">42 km</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Estimated Duration</span>
                <span className="font-medium">35-45 min</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="passenger">Passenger</Label>
              <Select defaultValue="john-chen">
                <SelectTrigger id="passenger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john-chen">John Chen - Sales Dept.</SelectItem>
                  <SelectItem value="sarah-lin">Sarah Lin - Marketing</SelectItem>
                  <SelectItem value="michael-wang">Michael Wang - Engineering</SelectItem>
                  <SelectItem value="new">+ Add new passenger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Type</Label>
              <Select defaultValue="sedan">
                <SelectTrigger id="vehicle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan (4 seats) - Standard</SelectItem>
                  <SelectItem value="suv">SUV (6 seats) - Premium</SelectItem>
                  <SelectItem value="van">Van (8 seats) - Group</SelectItem>
                  <SelectItem value="luxury">Luxury Sedan - Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-center">Cost Center</Label>
              <Select defaultValue="sales">
                <SelectTrigger id="cost-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Department</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="general">General & Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Instructions (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or notes for the driver..."
                className="resize-none"
              />
            </div>

            <Card className="border-primary/20 bg-gradient-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base Fare</span>
                    <span className="font-medium">$65</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distance Charge</span>
                    <span className="font-medium">$20</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Estimated Total</span>
                    <span className="text-xl font-bold text-primary">$85</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return CalendarIcon;
      case 2:
        return MapPin;
      case 3:
        return DollarSign;
      default:
        return CalendarIcon;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create New Booking</h2>
        <p className="text-muted-foreground">Schedule a new trip for your organization</p>
      </div>

      <div className="flex justify-between mb-8">
        {[1, 2, 3].map((s) => {
          const Icon = getStepIcon(s);
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    step >= s
                      ? "bg-gradient-primary border-primary text-primary-foreground shadow-glow"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn("text-xs mt-2", step >= s ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s === 1 ? "Basic Info" : s === 2 ? "Route" : "Details"}
                </span>
              </div>
              {s < 3 && (
                <div className={cn("h-0.5 flex-1 mx-2", step > s ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Step {step} of 3: {step === 1 ? "Basic Information" : step === 2 ? "Route Details" : "Passenger & Pricing"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Select trip type and pickup time"
              : step === 2
              ? "Enter pickup and drop-off locations"
              : "Choose passenger, vehicle, and review cost"}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : navigate("/bookings")}
        >
          {step === 1 ? "Cancel" : "Previous"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} className="bg-gradient-primary">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-gradient-primary shadow-md hover:shadow-lg">
            Create Booking
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewBooking;
