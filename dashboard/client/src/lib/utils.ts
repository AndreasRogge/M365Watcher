import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getWorkloadFromType(resourceType: string): string {
  const parts = resourceType.split(".");
  if (parts.length >= 2) {
    const workload = parts[1];
    const labels: Record<string, string> = {
      entra: "Entra ID",
      exchange: "Exchange Online",
      intune: "Intune",
      securityandcompliance: "Security & Compliance",
      teams: "Teams",
    };
    return labels[workload] || workload;
  }
  return resourceType;
}

export function getResourceShortName(resourceType: string): string {
  const parts = resourceType.split(".");
  return parts[parts.length - 1] || resourceType;
}
