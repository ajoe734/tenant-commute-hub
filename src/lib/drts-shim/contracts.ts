type LooseRecord = Record<string, unknown>;

export const BUSINESS_DISPATCH_SUBTYPES = [
  "credit_card_airport_transfer",
  "enterprise_dispatch",
] as const;

export const OWNED_ORDER_STATUSES = [
  "draft",
  "pending_assignment",
  "assignment_required",
  "assigned",
  "driver_enroute",
  "driver_arrived",
  "in_service",
  "completed",
  "cancelled",
  "dispatch_failed",
] as const;

export const REPORT_OUTPUT_FORMATS = ["csv", "xlsx", "pdf", "zip"] as const;

export type OwnedOrderStatus = (typeof OWNED_ORDER_STATUSES)[number];
export type TenantWebhookEndpointStatus = "active" | "test_pending";
export type TenantUserRoleStatus = "invited" | "active" | "suspended";

export interface MoneyAmount {
  currency: string;
  amountMinor: number;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface AuditLogRecord extends LooseRecord {
  auditId?: string;
  createdAt?: string | null;
}

export interface BookingRecord extends LooseRecord {
  bookingId: string;
  businessDispatchSubtype?: (typeof BUSINESS_DISPATCH_SUBTYPES)[number] | null;
  orderStatus: OwnedOrderStatus;
  passenger: {
    name: string;
  } & LooseRecord;
  pickup: {
    address: string;
  } & LooseRecord;
  dropoff: {
    address: string;
  } & LooseRecord;
  reservationWindowStart?: string | null;
}

export interface CreateReportJobCommand extends LooseRecord {
  reportType?: string;
  outputFormat?: (typeof REPORT_OUTPUT_FORMATS)[number];
}

export interface CreateTenantBookingCommand extends LooseRecord {
  passengerId?: string;
  pickupAddressId?: string;
  dropoffAddressId?: string;
}

export interface CreateTenantUserCommand extends LooseRecord {
  email?: string;
  fullName?: string;
  roleCode?: string;
}

export interface CreateTenantWebhookEndpointCommand extends LooseRecord {
  url?: string;
  secret?: string;
  events?: string[];
}

export interface GenerateTenantInvoiceCommand extends LooseRecord {
  periodMonth?: string;
}

export interface IssueTenantApiKeyCommand extends LooseRecord {
  displayName?: string;
  scopes?: string[];
}

export interface NotificationRecord extends LooseRecord {
  notificationId?: string;
  title?: string;
  message?: string;
  createdAt?: string | null;
}

export interface ReportJobRecord extends LooseRecord {
  jobId?: string;
  reportType?: string;
  outputFormat?: (typeof REPORT_OUTPUT_FORMATS)[number];
  status?: string;
  createdAt?: string | null;
}

export interface RotateTenantApiKeyCommand extends LooseRecord {
  rotateReason?: string;
}

export interface TenantAddressRecord extends LooseRecord {
  addressId?: string;
  label?: string;
  address?: string;
}

export interface TenantApiKeyIssued extends LooseRecord {
  apiKeyId?: string;
  apiKey?: string;
  plaintextKey?: string;
}

export interface TenantApiKeyRecord extends LooseRecord {
  apiKeyId?: string;
  displayName?: string;
  status?: string;
  lastUsedAt?: string | null;
  createdAt?: string | null;
}

export interface TenantBillingProfile extends LooseRecord {
  tenantId?: string;
  billingEmail?: string | null;
  invoicingDayOfMonth?: number | null;
  updatedAt?: string | null;
}

export interface TenantInvoiceRecord extends LooseRecord {
  invoiceId?: string;
  status?: string;
  issueDate?: string | null;
  dueDate?: string | null;
}

export interface TenantNotificationSubscription extends LooseRecord {
  eventType?: string;
  channel?: "email" | "webhook" | "ops_console";
  enabled?: boolean;
}

export interface TenantNotificationPreferences extends LooseRecord {
  tenantId?: string;
  subscriptions?: TenantNotificationSubscription[];
  updatedAt?: string | null;
}

export interface TenantPassengerRecord extends LooseRecord {
  passengerId?: string;
  fullName?: string;
  phoneNumber?: string | null;
}

export interface TenantRoleCatalogRecord extends LooseRecord {
  roleCode: string;
  displayName: string;
  description?: string;
  assignable: boolean;
}

export interface TenantSlaProfile extends LooseRecord {
  tenantId?: string;
  waitThresholdMin?: number;
  arrivalThresholdMin?: number;
  completionThresholdMin?: number;
  updatedAt?: string | null;
}

export interface TenantUserRoleRecord extends LooseRecord {
  userId?: string;
  fullName?: string;
  email?: string;
  roleCode?: string;
  status?: TenantUserRoleStatus;
}

export interface TenantWebhookEndpoint extends LooseRecord {
  webhookId?: string;
  url?: string;
  events?: string[];
  status?: TenantWebhookEndpointStatus;
  secretPreview?: string;
  updatedAt?: string | null;
}

export interface UpdateTenantBillingProfileCommand extends LooseRecord {
  billingEmail?: string;
  invoicingDayOfMonth?: number;
}

export interface UpdateTenantBookingCommand extends LooseRecord {
  reservationWindowStart?: string;
  notes?: string;
}

export interface UpdateTenantNotificationsCommand extends LooseRecord {
  subscriptions?: TenantNotificationSubscription[];
}

export interface UpdateTenantRoleCommand extends LooseRecord {
  roleCode?: string;
}

export interface UpdateTenantSlaProfileCommand extends LooseRecord {
  waitThresholdMin?: number;
  arrivalThresholdMin?: number;
  completionThresholdMin?: number;
}

export interface UpdateTenantWebhookEndpointCommand extends LooseRecord {
  url?: string;
  events?: string[];
  status?: TenantWebhookEndpointStatus;
}

export interface UpsertTenantAddressCommand extends LooseRecord {
  addressId?: string;
  label?: string;
  address?: string;
}

export interface UpsertTenantPassengerCommand extends LooseRecord {
  passengerId?: string;
  fullName?: string;
  phoneNumber?: string;
}

export interface WebhookDeliveryRecord extends LooseRecord {
  deliveryId?: string;
  eventType?: string;
  status?: string;
  createdAt?: string | null;
}
