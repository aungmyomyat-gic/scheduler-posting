import { z } from "zod";

const offsetDateTimeSchema = z.iso.datetime({ offset: true });

/**
 * Converts an ISO date-time with an explicit offset (or Z) to UTC.
 * Include the offset applicable to the input date; the server's time zone is not used.
 *
 * @example localDateTimeToUtc("2026-10-30T09:00:00+09:00") // "2026-10-30T00:00:00.000Z"
 */
export function localDateTimeToUtc(localDateTime: string): string {
  const result = offsetDateTimeSchema.safeParse(localDateTime);
  if (!result.success) {
    throw new RangeError("Provide a valid ISO date-time with a UTC offset or Z.");
  }
  return new Date(result.data).toISOString();
}
