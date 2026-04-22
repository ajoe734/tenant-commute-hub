import type { MoneyAmount } from "@drts/contracts";

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("zh-TW");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("zh-TW");
}

export function formatMoney(amount: MoneyAmount | null | undefined): string {
  if (!amount) {
    return "—";
  }

  return `${amount.currency} ${(amount.amountMinor / 100).toFixed(2)}`;
}

export function toDatetimeLocalValue(
  value: string | null | undefined,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
