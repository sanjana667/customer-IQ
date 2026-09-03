import { randomBytes } from "crypto";

export function generateId(): string {
  return randomBytes(12).toString("base64url");
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case "POS":
      return "text-green-600 bg-green-50";
    case "NEG":
      return "text-red-600 bg-red-50";
    case "NEU":
      return "text-yellow-600 bg-yellow-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export function sentimentLabel(sentiment: string | null): string {
  switch (sentiment) {
    case "POS":
      return "Positive";
    case "NEG":
      return "Negative";
    case "NEU":
      return "Neutral";
    default:
      return "Unknown";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "text-blue-600 bg-blue-50";
    case "REVIEWED":
      return "text-yellow-600 bg-yellow-50";
    case "ACTIONED":
      return "text-green-600 bg-green-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}
