export function formatRelativeTime(value: string): string {
  const createdAt = new Date(value).getTime();

  if (!Number.isFinite(createdAt)) {
    return "";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));

  if (seconds < 45) {
    return "now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
