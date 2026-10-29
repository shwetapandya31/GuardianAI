export function formatTime(date?: Date | null): string {
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString();
}

export function formatCoord(value?: number | null): string {
  return typeof value === "number" ? value.toFixed(5) : "—";
}

export function formatConfidence(value: number): string {
  return `${Math.round((value || 0) * 100)}%`;
}
