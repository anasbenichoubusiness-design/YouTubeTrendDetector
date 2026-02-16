/**
 * Parse an ISO 8601 duration string (e.g. "PT15M33S") into total seconds.
 *
 * Handles hours, minutes, and seconds components. Returns 0 for
 * empty or unparseable strings.
 */
export function parseDuration(iso8601: string): number {
  if (!iso8601) return 0;

  const match = iso8601.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}
