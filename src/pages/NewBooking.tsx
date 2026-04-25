import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  CreateTenantBookingCommand,
  PartnerEligibilityVerificationRecord,
  TenantAddressRecord,
  TenantPassengerRecord,
} from "@drts/contracts";
import { BUSINESS_DISPATCH_SUBTYPES } from "@drts/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toDatetimeLocalValue, toErrorMessage } from "@/lib/formatting";
import { toast } from "sonner";

interface BookingFormState {
  passengerId: string;
  businessDispatchSubtype: CreateTenantBookingCommand["businessDispatchSubtype"];
  pickupAddressId: string;
  pickupAddress: string;
  dropoffAddressId: string;
  dropoffAddress: string;
  reservationWindowStart: string;
  reservationWindowEnd: string;
  bookedByName: string;
  bookedByEmail: string;
  onsiteContactName: string;
  onsiteContactPhone: string;
  costCenter: string;
  vehiclePreference: string;
  direction: "pickup" | "dropoff";
  flightNo: string;
  terminal: string;
  luggageCount: string;
  notes: string;
  signoffRequired: boolean;
  expenseProofRequired: boolean;
}

function defaultForm(): BookingFormState {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    passengerId: "",
    businessDispatchSubtype: "enterprise_dispatch",
    pickupAddressId: "",
    pickupAddress: "",
    dropoffAddressId: "",
    dropoffAddress: "",
    reservationWindowStart: toDatetimeLocalValue(start.toISOString()),
    reservationWindowEnd: toDatetimeLocalValue(end.toISOString()),
    bookedByName: "",
    bookedByEmail: "",
    onsiteContactName: "",
    onsiteContactPhone: "",
    costCenter: "",
    vehiclePreference: "",
    direction: "pickup",
    flightNo: "",
    terminal: "",
    luggageCount: "",
    notes: "",
    signoffRequired: false,
    expenseProofRequired: false,
  };
}

export default function NewBooking() {
  const navigate = useNavigate();
  const { client, partnerEntry } = useAuth();
  const [passengers, setPassengers] = useState<TenantPassengerRecord[]>([]);
  const [addresses, setAddresses] = useState<TenantAddressRecord[]>([]);
  const [form, setForm] = useState<BookingFormState>(defaultForm);
  const [cardLast4, setCardLast4] = useState("");
  const [referenceToken, setReferenceToken] = useState("");
  const [eligibilityVerification, setEligibilityVerification] =
    useState<PartnerEligibilityVerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingEligibility, setVerifyingEligibility] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [nextPassengers, nextAddresses] = await Promise.all([
          client.listPassengers(),
          client.listAddresses(),
        ]);
        if (!active) {
          return;
        }
        setPassengers(nextPassengers.filter((passenger) => passenger.activeFlag));
        setAddresses(nextAddresses.filter((address) => address.activeFlag));
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

  const passengerLookup = useMemo(
    () => new Map(passengers.map((passenger) => [passenger.passengerId, passenger])),
    [passengers],
  );
  const addressLookup = useMemo(
    () => new Map(addresses.map((address) => [address.addressId, address])),
    [addresses],
  );
  const eligibilityRequired =
    partnerEntry?.eligibilityMode !== undefined &&
    partnerEntry.eligibilityMode !== "none";
  const canVerifyEligibility = Boolean(
    client &&
      partnerEntry &&
      ((!partnerEntry ||
        partnerEntry.eligibilityMode === "none" ||
        partnerEntry.eligibilityMode === "bank_card_inline") &&
      /^[0-9]{4}$/.test(cardLast4.trim())
        ? true
        : partnerEntry?.eligibilityMode === "reference_required" &&
            referenceToken.trim().length > 0),
  );

  useEffect(() => {
    if (!partnerEntry) {
      return;
    }

    setForm((current) => ({
      ...current,
      businessDispatchSubtype: partnerEntry.businessDispatchSubtype,
      direction:
        partnerEntry.businessDispatchSubtype === "credit_card_airport_transfer"
          ? "pickup"
          : current.direction,
    }));
  }, [partnerEntry]);

  useEffect(() => {
    setEligibilityVerification(null);
  }, [partnerEntry?.entrySlug, cardLast4, referenceToken]);

  const handleAddressChange = (
    field: "pickupAddressId" | "dropoffAddressId",
    value: string,
  ) => {
    const selected = addressLookup.get(value);
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "pickupAddressId"
        ? { pickupAddress: selected?.addressText ?? current.pickupAddress }
        : { dropoffAddress: selected?.addressText ?? current.dropoffAddress }),
    }));
  };

  const handleVerifyEligibility = async () => {
    if (!client || !partnerEntry) {
      return;
    }

    setVerifyingEligibility(true);
    try {
      const verification = await client.verifyPartnerEligibility({
        entrySlug: partnerEntry.entrySlug,
        ...(partnerEntry.eligibilityMode === "bank_card_inline"
          ? { cardLast4: cardLast4.trim() }
          : {}),
        ...(partnerEntry.eligibilityMode === "reference_required"
          ? { referenceToken: referenceToken.trim() }
          : {}),
        ...(form.flightNo.trim() ? { flightNo: form.flightNo.trim() } : {}),
      });

      setEligibilityVerification(verification);
      if (verification.verificationStatus === "eligible") {
        toast.success("Partner eligibility verified.");
        setError(null);
      } else {
        toast.error("Partner eligibility was not approved for this booking.");
      }
    } catch (verifyError) {
      const message = toErrorMessage(verifyError);
      setError(message);
      toast.error(message);
    } finally {
      setVerifyingEligibility(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    const passenger = passengerLookup.get(form.passengerId);
    if (!passenger) {
      setError("A valid passenger is required.");
      return;
    }
    if (!form.pickupAddress.trim() || !form.dropoffAddress.trim()) {
      setError("Pickup and dropoff addresses are required.");
      return;
    }
    if (
      eligibilityRequired &&
      eligibilityVerification?.verificationStatus !== "eligible"
    ) {
      setError("Eligible partner verification is required before booking.");
      return;
    }

    setSaving(true);
    try {
      const command: CreateTenantBookingCommand = {
        businessDispatchSubtype: form.businessDispatchSubtype,
        pickup: {
          address: form.pickupAddress.trim(),
        },
        dropoff: {
          address: form.dropoffAddress.trim(),
        },
        reservationWindowStart: new Date(
          form.reservationWindowStart,
        ).toISOString(),
        reservationWindowEnd: new Date(form.reservationWindowEnd).toISOString(),
        passenger: {
          name: passenger.fullName,
          phone: passenger.mobile || passenger.email || "N/A",
        },
        ...(form.bookedByName.trim() && form.bookedByEmail.trim()
          ? {
              bookedBy: {
                name: form.bookedByName.trim(),
                email: form.bookedByEmail.trim(),
              },
            }
          : {}),
        ...(form.onsiteContactName.trim() && form.onsiteContactPhone.trim()
          ? {
              onsiteContact: {
                name: form.onsiteContactName.trim(),
                phone: form.onsiteContactPhone.trim(),
              },
            }
          : {}),
        ...(form.costCenter.trim() ? { costCenter: form.costCenter.trim() } : {}),
        ...(form.vehiclePreference.trim()
          ? { vehiclePreference: form.vehiclePreference.trim() }
          : {}),
        ...(form.direction ? { direction: form.direction } : {}),
        ...(form.flightNo.trim() ? { flightNo: form.flightNo.trim() } : {}),
        ...(form.terminal.trim() ? { terminal: form.terminal.trim() } : {}),
        ...(form.luggageCount.trim()
          ? { luggageCount: Number(form.luggageCount) }
          : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(partnerEntry ? { partnerEntrySlug: partnerEntry.entrySlug } : {}),
        ...(eligibilityVerification?.eligibilityVerificationId
          ? {
              eligibilityVerificationId:
                eligibilityVerification.eligibilityVerificationId,
            }
          : {}),
        signoffRequired: form.signoffRequired,
        expenseProofRequired: form.expenseProofRequired,
      };

      await client.createTenantBooking(command);
      toast.success("Booking created.");
      navigate("/booking-list");
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
        <CardTitle>Create Booking</CardTitle>
        <CardDescription>
          Booking truth now lives in `/api/tenant/bookings`. Price quotes and
          dispatch lifecycle are no longer computed in repo B.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
            {partnerEntry && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="font-medium">{partnerEntry.displayName}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Partner code: {partnerEntry.partnerCode}
                  {partnerEntry.bankCode ? ` · Bank: ${partnerEntry.bankCode}` : ""}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  This entry is locked to subtype `{partnerEntry.businessDispatchSubtype}`.
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Passenger</Label>
                <Select
                  value={form.passengerId}
                  onValueChange={(passengerId) =>
                    setForm((current) => ({ ...current, passengerId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select passenger" />
                  </SelectTrigger>
                  <SelectContent>
                    {passengers.map((passenger) => (
                      <SelectItem
                        key={passenger.passengerId}
                        value={passenger.passengerId}
                      >
                        {passenger.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subtype</Label>
                <Select
                  value={form.businessDispatchSubtype}
                  onValueChange={(businessDispatchSubtype) =>
                    setForm((current) => ({
                      ...current,
                      businessDispatchSubtype:
                        businessDispatchSubtype as CreateTenantBookingCommand["businessDispatchSubtype"],
                    }))
                  }
                  disabled={Boolean(partnerEntry)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_DISPATCH_SUBTYPES.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pickup saved address</Label>
                <Select
                  value={form.pickupAddressId}
                  onValueChange={(value) =>
                    handleAddressChange("pickupAddressId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pickup address" />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((address) => (
                      <SelectItem key={address.addressId} value={address.addressId}>
                        {address.addressName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={3}
                  value={form.pickupAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pickupAddress: event.target.value,
                    }))
                  }
                  placeholder="Pickup address"
                />
              </div>
              <div className="space-y-2">
                <Label>Dropoff saved address</Label>
                <Select
                  value={form.dropoffAddressId}
                  onValueChange={(value) =>
                    handleAddressChange("dropoffAddressId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dropoff address" />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((address) => (
                      <SelectItem key={address.addressId} value={address.addressId}>
                        {address.addressName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={3}
                  value={form.dropoffAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dropoffAddress: event.target.value,
                    }))
                  }
                  placeholder="Dropoff address"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reservation window start</Label>
                <Input
                  type="datetime-local"
                  value={form.reservationWindowStart}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationWindowStart: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Reservation window end</Label>
                <Input
                  type="datetime-local"
                  value={form.reservationWindowEnd}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationWindowEnd: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Booked by name</Label>
                <Input
                  value={form.bookedByName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bookedByName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Booked by email</Label>
                <Input
                  type="email"
                  value={form.bookedByEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bookedByEmail: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Onsite contact name</Label>
                <Input
                  value={form.onsiteContactName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      onsiteContactName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Onsite contact phone</Label>
                <Input
                  value={form.onsiteContactPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      onsiteContactPhone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cost center</Label>
                <Input
                  value={form.costCenter}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      costCenter: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle preference</Label>
                <Input
                  value={form.vehiclePreference}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vehiclePreference: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={form.direction}
                  onValueChange={(direction) =>
                    setForm((current) => ({
                      ...current,
                      direction: direction as "pickup" | "dropoff",
                    }))
                  }
                  disabled={
                    partnerEntry?.businessDispatchSubtype ===
                    "credit_card_airport_transfer"
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">pickup</SelectItem>
                    <SelectItem value="dropoff">dropoff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Flight No</Label>
                <Input
                  value={form.flightNo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      flightNo: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Terminal</Label>
                <Input
                  value={form.terminal}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      terminal: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Luggage count</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.luggageCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      luggageCount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {partnerEntry && (
              <div className="space-y-4 rounded-lg border border-border/60 p-4">
                <div>
                  <h3 className="font-medium">Partner eligibility</h3>
                  <p className="text-sm text-muted-foreground">
                    This booking is being created under partner entry `{partnerEntry.entrySlug}`.
                    {eligibilityRequired
                      ? " Eligibility verification is required before submission."
                      : " Eligibility verification is not required for this entry."}
                  </p>
                </div>

                {partnerEntry.eligibilityMode === "bank_card_inline" && (
                  <div className="space-y-2">
                    <Label>Card last 4 digits</Label>
                    <Input
                      value={cardLast4}
                      maxLength={4}
                      inputMode="numeric"
                      onChange={(event) =>
                        setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="2468"
                    />
                  </div>
                )}

                {partnerEntry.eligibilityMode === "reference_required" && (
                  <div className="space-y-2">
                    <Label>Partner reference token</Label>
                    <Input
                      value={referenceToken}
                      onChange={(event) => setReferenceToken(event.target.value)}
                      placeholder="BETA0001"
                    />
                  </div>
                )}

                {eligibilityRequired && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canVerifyEligibility || verifyingEligibility}
                      onClick={() => void handleVerifyEligibility()}
                    >
                      {verifyingEligibility ? "Verifying..." : "Verify eligibility"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {eligibilityVerification
                        ? `Status: ${eligibilityVerification.verificationStatus} (${eligibilityVerification.verificationReasonCode})`
                        : "No eligibility verification recorded yet."}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="signoff-required"
                  checked={form.signoffRequired}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      signoffRequired: checked === true,
                    }))
                  }
                />
                <Label htmlFor="signoff-required">Signoff required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expense-proof-required"
                  checked={form.expenseProofRequired}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      expenseProofRequired: checked === true,
                    }))
                  }
                />
                <Label htmlFor="expense-proof-required">
                  Expense proof required
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Booking"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/booking-list")}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
