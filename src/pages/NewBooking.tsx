import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  CreateTenantBookingCommand,
  PartnerEligibilityVerificationRecord,
  TenantAddressRecord,
  TenantPassengerRecord,
} from "@drts/contracts";
import { BUSINESS_DISPATCH_SUBTYPES } from "@drts/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildPartnerBranding,
  eligibilityModeToLabel,
  PARTNER_SUPPORT_COPY,
  partnerAccentStyle,
} from "@/lib/drtsApi";
import { toDatetimeLocalValue, toErrorMessage } from "@/lib/formatting";
import { Info, User, Car, HelpCircle } from "lucide-react";
import { toast } from "sonner";

type VehiclePreferenceValue = "human_driver" | "autonomous" | "no_preference";

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
  vehiclePreference: VehiclePreferenceValue;
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
    vehiclePreference: "no_preference",
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
  const { client, partnerEntry, isPartnerMode } = useAuth();
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

  const resetPartnerForm = () => {
    setForm(defaultForm());
    setCardLast4("");
    setReferenceToken("");
    setEligibilityVerification(null);
    setError(null);
  };

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
  const partnerBranding = buildPartnerBranding(partnerEntry);
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
        toast.success("合作方案資格驗證成功。");
        setError(null);
      } else {
        toast.error("此筆預約未通過合作方案資格驗證。");
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
      setError("請先選擇有效的乘車人。");
      return;
    }
    if (!form.pickupAddress.trim() || !form.dropoffAddress.trim()) {
      setError("請填寫上車與下車地點。");
      return;
    }
    if (
      eligibilityRequired &&
      eligibilityVerification?.verificationStatus !== "eligible"
    ) {
      setError("送出預約前需先完成合作方案資格驗證。");
      return;
    }

    if (form.vehiclePreference === "autonomous") {
      const confirmed = window.confirm(
        "您選擇了自駕車服務。\n\n" +
        "請注意：若路線不適合自駕車（如山區、工地、特殊限制區域），" +
        "系統可能改派人類司機，但仍會保留優惠折扣。\n\n" +
        "確定要繼續預約嗎？"
      );
      if (!confirmed) return;
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
        vehiclePreference: form.vehiclePreference,
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
      toast.success(isPartnerMode ? "合作方預約已送出。" : "預約已建立。");
      if (isPartnerMode) {
        resetPartnerForm();
      } else {
        navigate("/booking-list");
      }
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
        <CardTitle>{isPartnerMode ? "建立合作方預約" : "建立預約"}</CardTitle>
        <CardDescription>
          {isPartnerMode
            ? "此入口僅提供合作方案預約建立。預約真相仍由 `/api/tenant/bookings` 與資格驗證 API 維護。"
            : "預約真相已統一由 `/api/tenant/bookings` 維護，價格試算與派車生命週期不再於前端 repo 計算。"}
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
              <div
                className="rounded-lg border border-primary/20 bg-primary/5 p-4"
                style={partnerAccentStyle(partnerEntry)}
              >
                <div className="font-medium">{partnerEntry.displayName}</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {partnerBranding.map((item) => (
                    <div key={item.label}>
                      {item.label}：{item.value}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  此入口固定使用 `{partnerEntry.businessDispatchSubtype}` 車隊派遣子類型。
                </div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">
                  {PARTNER_SUPPORT_COPY}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>乘車人</Label>
                <Select
                  value={form.passengerId}
                  onValueChange={(passengerId) =>
                    setForm((current) => ({ ...current, passengerId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇乘車人" />
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
                <Label>派遣子類型</Label>
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
                <Label>上車常用地址</Label>
                <Select
                  value={form.pickupAddressId}
                  onValueChange={(value) =>
                    handleAddressChange("pickupAddressId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇常用上車地址" />
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
                  placeholder="輸入上車地址"
                />
              </div>
              <div className="space-y-2">
                <Label>下車常用地址</Label>
                <Select
                  value={form.dropoffAddressId}
                  onValueChange={(value) =>
                    handleAddressChange("dropoffAddressId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇常用下車地址" />
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
                  placeholder="輸入下車地址"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>搭乘時間起</Label>
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
                <Label>搭乘時間迄</Label>
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
                <Label>代訂人姓名</Label>
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
                <Label>代訂人電子郵件</Label>
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
                <Label>現場聯絡人姓名</Label>
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
                <Label>現場聯絡人電話</Label>
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
                <Label>成本中心</Label>
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
                <Label>偏好用車類型 *</Label>
                <RadioGroup
                  value={form.vehiclePreference}
                  onValueChange={(value: VehiclePreferenceValue) =>
                    setForm((current) => ({
                      ...current,
                      vehiclePreference: value,
                    }))
                  }
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                    <RadioGroupItem value="human_driver" id="vp_human" />
                    <Label htmlFor="vp_human" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">人類司機</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        由專業司機服務，適合需要協助搬運或特殊需求
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                    <RadioGroupItem value="autonomous" id="vp_auto" />
                    <Label htmlFor="vp_auto" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span className="font-medium">自駕車</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        智能自動駕駛車輛，環保且可能享有折扣優惠
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                    <RadioGroupItem value="no_preference" id="vp_none" />
                    <Label htmlFor="vp_none" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        <span className="font-medium">無偏好</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        系統自動分配最佳車輛類型
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                {form.vehiclePreference === "autonomous" && (
                  <Alert className="mt-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-300">
                      自駕車服務可享 <strong>9折優惠</strong>。若您的路線不適合自駕車（如特殊地形、施工路段），系統可能改派人類司機。
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>接送方向</Label>
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
                    <SelectItem value="pickup">接機 / 接送起點</SelectItem>
                    <SelectItem value="dropoff">送機 / 送達終點</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>航班號碼</Label>
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
                <Label>航廈</Label>
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
                <Label>行李件數</Label>
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
                <Label>備註</Label>
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
                  <h3 className="font-medium">合作方案資格驗證</h3>
                  <p className="text-sm text-muted-foreground">
                    此筆預約將以合作方入口 `{partnerEntry.entrySlug}` 建立。
                    {eligibilityRequired
                      ? ` 送出前需完成 ${eligibilityModeToLabel(partnerEntry.eligibilityMode)}。`
                      : " 此入口不需要額外資格驗證。"}
                  </p>
                </div>

                {partnerEntry.eligibilityMode === "bank_card_inline" && (
                  <div className="space-y-2">
                    <Label>卡號末四碼</Label>
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
                    <Label>合作方案識別碼</Label>
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
                      {verifyingEligibility ? "驗證中..." : "驗證資格"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {eligibilityVerification
                        ? `驗證結果：${eligibilityVerification.verificationStatus}（${eligibilityVerification.verificationReasonCode}）`
                        : "尚未建立資格驗證紀錄。"}
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
                <Label htmlFor="signoff-required">需要簽收</Label>
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
                  需要報銷憑證
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "送出中..." : "建立預約"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  isPartnerMode ? resetPartnerForm() : navigate("/booking-list")
                }
              >
                {isPartnerMode ? "清除重填" : "取消"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
