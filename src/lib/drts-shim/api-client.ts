import type {
  ApiSuccessEnvelope,
  AuditLogRecord,
  BookingRecord,
  CreateReportJobCommand,
  CreateTenantBookingCommand,
  CreateTenantUserCommand,
  CreateTenantWebhookEndpointCommand,
  NotificationRecord,
  ReportJobRecord,
  RotateTenantApiKeyCommand,
  TenantAddressRecord,
  TenantApiKeyRecord,
  TenantBillingProfile,
  TenantInvoiceRecord,
  TenantNotificationPreferences,
  TenantPassengerRecord,
  TenantRoleCatalogRecord,
  TenantSlaProfile,
  TenantUserRoleRecord,
  TenantWebhookEndpoint,
  UpdateTenantBookingCommand,
  UpdateTenantNotificationsCommand,
  UpdateTenantRoleCommand,
  UpdateTenantSlaProfileCommand,
  UpdateTenantWebhookEndpointCommand,
  UpsertTenantAddressCommand,
  UpsertTenantPassengerCommand,
  WebhookDeliveryRecord,
} from "./contracts";

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

interface ListEnvelope<T> {
  items?: T[];
}

function createRequestToken(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasHeader(headers: Record<string, string>, key: string): boolean {
  const target = key.toLowerCase();
  return Object.keys(headers).some((header) => header.toLowerCase() === target);
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    };
    this.timeout = config.timeout ?? 30000;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  private async getList<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<T[]> {
    const result = await this.get<T[] | ListEnvelope<T>>(path, options);
    return Array.isArray(result) ? result : (result.items ?? []);
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers = {
        ...this.defaultHeaders,
        ...options?.headers,
      };
      if (!hasHeader(headers, "x-request-id")) {
        headers["X-Request-Id"] = createRequestToken();
      }
      if (
        method.toUpperCase() === "POST" &&
        !hasHeader(headers, "idempotency-key")
      ) {
        headers["Idempotency-Key"] = createRequestToken();
      }

      const init: RequestInit = {
        method,
        headers,
        signal: options?.signal ?? controller.signal,
      };

      if (options?.body !== undefined) {
        init.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, init);
      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${await response.text()}`);
      }

      const envelope: ApiSuccessEnvelope<T> = await response.json();
      return envelope.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getIdentityContext() {
    return this.get("/api/identity/context");
  }

  async createTenantBooking(command: CreateTenantBookingCommand) {
    return this.post("/api/tenant/bookings", { body: command });
  }

  async listTenantBookings(): Promise<BookingRecord[]> {
    return this.getList<BookingRecord>("/api/tenant/bookings");
  }

  async getTenantBooking(bookingId: string) {
    return this.get<BookingRecord>(
      `/api/tenant/bookings/${encodeURIComponent(bookingId)}`,
    );
  }

  async updateTenantBooking(
    bookingId: string,
    command: UpdateTenantBookingCommand,
  ) {
    return this.request<BookingRecord>(
      "PUT",
      `/api/tenant/bookings/${encodeURIComponent(bookingId)}`,
      { body: command },
    );
  }

  async cancelTenantBooking(
    bookingId: string,
    command: Record<string, unknown>,
  ) {
    return this.post(
      `/api/tenant/bookings/${encodeURIComponent(bookingId)}/cancel`,
      { body: command },
    );
  }

  async getBillingProfile(): Promise<TenantBillingProfile> {
    return this.get<TenantBillingProfile>("/api/tenant/billing/profile");
  }

  async listInvoices(): Promise<TenantInvoiceRecord[]> {
    return this.getList<TenantInvoiceRecord>("/api/tenant/invoices");
  }

  async createTenantReportJob(command: CreateReportJobCommand) {
    return this.post("/api/tenant/reports/jobs", { body: command });
  }

  async listTenantReportJobs(): Promise<ReportJobRecord[]> {
    return this.getList<ReportJobRecord>("/api/tenant/reports/jobs");
  }

  async listPassengers(): Promise<TenantPassengerRecord[]> {
    return this.getList<TenantPassengerRecord>("/api/tenant/passengers");
  }

  async upsertPassenger(command: UpsertTenantPassengerCommand) {
    return this.post("/api/tenant/passengers", { body: command });
  }

  async listAddresses(): Promise<TenantAddressRecord[]> {
    return this.getList<TenantAddressRecord>("/api/tenant/addresses");
  }

  async upsertAddress(command: UpsertTenantAddressCommand) {
    return this.post("/api/tenant/addresses", { body: command });
  }

  async listApiKeys(): Promise<TenantApiKeyRecord[]> {
    return this.getList<TenantApiKeyRecord>("/api/tenant/api-keys");
  }

  async issueApiKey(command: Record<string, unknown>) {
    return this.post("/api/tenant/api-keys", { body: command });
  }

  async rotateApiKey(apiKeyId: string, command: RotateTenantApiKeyCommand) {
    return this.post(
      `/api/tenant/api-keys/${encodeURIComponent(apiKeyId)}/rotate`,
      { body: command },
    );
  }

  async revokeApiKey(apiKeyId: string) {
    return this.post(`/api/tenant/api-keys/${encodeURIComponent(apiKeyId)}/revoke`);
  }

  async listWebhooks(): Promise<TenantWebhookEndpoint[]> {
    return this.getList<TenantWebhookEndpoint>("/api/tenant/webhooks");
  }

  async createWebhookEndpoint(command: CreateTenantWebhookEndpointCommand) {
    return this.post("/api/tenant/webhooks", { body: command });
  }

  async updateWebhookEndpoint(
    webhookId: string,
    command: UpdateTenantWebhookEndpointCommand,
  ): Promise<TenantWebhookEndpoint> {
    return this.post<TenantWebhookEndpoint>(
      `/api/tenant/webhooks/${encodeURIComponent(webhookId)}`,
      { body: command },
    );
  }

  async deleteWebhookEndpoint(webhookId: string) {
    return this.delete(`/api/tenant/webhooks/${encodeURIComponent(webhookId)}`);
  }

  async listWebhookDeliveries(
    webhookId: string,
  ): Promise<WebhookDeliveryRecord[]> {
    return this.getList<WebhookDeliveryRecord>(
      `/api/tenant/webhooks/${encodeURIComponent(webhookId)}/deliveries`,
    );
  }

  async listTenantNotificationFeed(): Promise<NotificationRecord[]> {
    return this.getList<NotificationRecord>("/api/tenant/notifications/feed");
  }

  async getNotificationPreferences(): Promise<TenantNotificationPreferences> {
    return this.get<TenantNotificationPreferences>("/api/tenant/notifications");
  }

  async updateNotifications(command: UpdateTenantNotificationsCommand) {
    return this.post("/api/tenant/notifications", { body: command });
  }

  async getSlaProfile(): Promise<TenantSlaProfile> {
    return this.get<TenantSlaProfile>("/api/tenant/sla");
  }

  async updateSlaProfile(command: UpdateTenantSlaProfileCommand) {
    return this.post("/api/tenant/sla", { body: command });
  }

  async listTenantUsers(): Promise<TenantUserRoleRecord[]> {
    return this.getList<TenantUserRoleRecord>("/api/tenant/users");
  }

  async listTenantRoles(): Promise<TenantRoleCatalogRecord[]> {
    return this.getList<TenantRoleCatalogRecord>("/api/tenant/roles");
  }

  async createTenantUser(command: CreateTenantUserCommand) {
    return this.post("/api/tenant/users", { body: command });
  }

  async updateTenantRole(userId: string, command: UpdateTenantRoleCommand) {
    return this.post(`/api/tenant/users/${encodeURIComponent(userId)}/role`, {
      body: command,
    });
  }

  async listTenantAuditLogs(): Promise<AuditLogRecord[]> {
    return this.getList<AuditLogRecord>("/api/tenant/audit");
  }
}
