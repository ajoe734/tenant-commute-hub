import { useEffect, useMemo, useState } from "react";
import {
  TENANT_ADDRESS_GEOCODE_SOURCES,
  type TenantAddressExportViewRecord,
  type TenantAddressGeocodeSource,
  type TenantAddressRecord,
  type UpsertTenantAddressCommand,
} from "@drts/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface AddressFormState {
  addressId?: string;
  addressName: string;
  addressText: string;
  lat: string;
  lng: string;
  geocodeSource: TenantAddressGeocodeSource;
  sensitiveFlag: boolean;
  tags: string;
  ownerPassengerId: string;
  activeFlag: boolean;
}

const GEOCODE_SOURCE_LABELS: Record<TenantAddressGeocodeSource, string> = {
  none: "未定位",
  manual: "人工定位",
  provider: "供應商定位",
};

const ADDRESS_QUALITY_LABELS: Record<string, string> = {
  missing_geocode: "缺少座標",
  duplicate_normalized_address: "標準化地址重複",
};

const EMPTY_FORM: AddressFormState = {
  addressName: "",
  addressText: "",
  lat: "",
  lng: "",
  geocodeSource: "none",
  sensitiveFlag: false,
  tags: "",
  ownerPassengerId: "",
  activeFlag: true,
};

function toFormState(address: TenantAddressRecord): AddressFormState {
  return {
    addressId: address.addressId,
    addressName: address.addressName,
    addressText: address.addressText,
    lat: address.lat != null ? String(address.lat) : "",
    lng: address.lng != null ? String(address.lng) : "",
    geocodeSource: address.geocodeSource ?? "none",
    sensitiveFlag: address.sensitiveFlag ?? false,
    tags: address.tags.join(", "),
    ownerPassengerId: address.ownerPassengerId ?? "",
    activeFlag: address.activeFlag,
  };
}

export default function AddressManagement() {
  const { client } = useAuth();
  const [addresses, setAddresses] = useState<TenantAddressRecord[]>([]);
  const [addressExportView, setAddressExportView] = useState<
    TenantAddressExportViewRecord[]
  >([]);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [addresses],
  );
  const exportViewById = useMemo(
    () =>
      new Map(
        addressExportView.map((address) => [address.addressId, address]),
      ),
    [addressExportView],
  );

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [nextAddresses, nextAddressExportView] = await Promise.all([
          client.listAddresses(),
          client.listAddressExportView(),
        ]);
        if (!active) {
          return;
        }
        setAddresses(nextAddresses);
        setAddressExportView(nextAddressExportView);
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

  const reloadAddresses = async () => {
    if (!client) {
      return;
    }
    const [nextAddresses, nextAddressExportView] = await Promise.all([
      client.listAddresses(),
      client.listAddressExportView(),
    ]);
    setAddresses(nextAddresses);
    setAddressExportView(nextAddressExportView);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      const command: UpsertTenantAddressCommand = {
        ...(form.addressId ? { addressId: form.addressId } : {}),
        addressName: form.addressName.trim(),
        addressText: form.addressText.trim(),
        ...(form.lat.trim() ? { lat: Number(form.lat) } : {}),
        ...(form.lng.trim() ? { lng: Number(form.lng) } : {}),
        ...(form.ownerPassengerId.trim()
          ? { ownerPassengerId: form.ownerPassengerId.trim() }
          : {}),
        sensitiveFlag: form.sensitiveFlag,
        geocodeSource: form.geocodeSource,
        tags: splitCommaSeparated(form.tags),
        activeFlag: form.activeFlag,
      };

      await client.upsertAddress(command);
      await reloadAddresses();
      setForm(EMPTY_FORM);
      toast.success(form.addressId ? "Address updated." : "Address created.");
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      toast.error(toErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (address: TenantAddressRecord) => {
    if (!client) {
      return;
    }

    setSaving(true);
    try {
      await client.upsertAddress({
        addressId: address.addressId,
        ownerPassengerId: address.ownerPassengerId,
        addressName: address.addressName,
        addressText: address.addressText,
        lat: address.lat,
        lng: address.lng,
        sensitiveFlag: address.sensitiveFlag ?? false,
        geocodeSource: address.geocodeSource ?? "none",
        tags: address.tags,
        activeFlag: false,
      });
      await reloadAddresses();
      toast.success("Address deactivated.");
    } catch (deactivateError) {
      toast.error(toErrorMessage(deactivateError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Address Book</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label>Address name</Label>
            <Input
              value={form.addressName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  addressName: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Owner passenger ID</Label>
            <Input
              value={form.ownerPassengerId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownerPassengerId: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address text</Label>
            <Textarea
              rows={3}
              value={form.addressText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  addressText: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input
              type="number"
              value={form.lat}
              onChange={(event) =>
                setForm((current) => ({ ...current, lat: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input
              type="number"
              value={form.lng}
              onChange={(event) =>
                setForm((current) => ({ ...current, lng: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Geocode source</Label>
            <Select
              value={form.geocodeSource}
              onValueChange={(geocodeSource) =>
                setForm((current) => ({
                  ...current,
                  geocodeSource:
                    geocodeSource as TenantAddressGeocodeSource,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENANT_ADDRESS_GEOCODE_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {GEOCODE_SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="address-sensitive-flag"
              checked={form.sensitiveFlag}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  sensitiveFlag: checked === true,
                }))
              }
            />
            <Label htmlFor="address-sensitive-flag">Sensitive address</Label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(event) =>
                setForm((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="office, warehouse"
            />
          </div>
          <div className="flex items-end gap-3 md:col-span-2">
            <Button type="submit" disabled={saving}>
              {form.addressId ? "Save Changes" : "Create Address"}
            </Button>
            {form.addressId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(EMPTY_FORM)}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Master Address</TableHead>
                <TableHead>Export View</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Governance</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAddresses.map((address) => (
                <TableRow key={address.addressId}>
                  <TableCell>{address.addressName}</TableCell>
                  <TableCell>{address.addressText}</TableCell>
                  <TableCell>
                    {exportViewById.get(address.addressId)?.maskedAddressText ?? "—"}
                  </TableCell>
                  <TableCell>
                    {address.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {address.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(address.sensitiveFlag ??
                      exportViewById.get(address.addressId)?.sensitiveFlag)
                        ? (
                          <Badge variant="destructive">Sensitive</Badge>
                        )
                        : null}
                      <Badge variant="outline">
                        {
                          GEOCODE_SOURCE_LABELS[
                            exportViewById.get(address.addressId)?.geocodeSource ??
                              address.geocodeSource ??
                              "none"
                          ]
                        }
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(exportViewById.get(address.addressId)?.qualityIssues ??
                        address.qualityIssues ??
                        []
                      ).length > 0 ? (
                        (
                          exportViewById.get(address.addressId)?.qualityIssues ??
                          address.qualityIssues ??
                          []
                        ).map((issue) => (
                          <Badge key={issue} variant="outline">
                            {ADDRESS_QUALITY_LABELS[issue] ?? issue}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{address.activeFlag ? "Active" : "Inactive"}</TableCell>
                  <TableCell>{formatDateTime(address.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-primary hover:underline"
                        type="button"
                        onClick={() => setForm(toFormState(address))}
                      >
                        Edit
                      </button>
                      {address.activeFlag && (
                        <button
                          className="text-destructive hover:underline"
                          type="button"
                          onClick={() => void handleDeactivate(address)}
                        >
                          Deactivate
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
