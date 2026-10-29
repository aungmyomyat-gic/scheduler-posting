import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "./local-date-time-to-utc.js";

describe("localDateTimeToUtc", () => {
  it.each([
    ["Japan offset", "2026-10-30T09:00:00+09:00", "2026-10-30T00:00:00.000Z"],
    ["Myanmar half-hour offset", "2026-10-30T09:00:00+06:30", "2026-10-30T02:30:00.000Z"],
    ["negative offset", "2026-10-30T09:00:00-05:00", "2026-10-30T14:00:00.000Z"],
    ["previous UTC day", "2026-10-30T00:30:00+09:00", "2026-10-29T15:30:00.000Z"],
    ["next UTC year", "2026-12-31T23:30:00-02:00", "2027-01-01T01:30:00.000Z"],
    ["leap day", "2024-02-29T09:00:00+09:00", "2024-02-29T00:00:00.000Z"],
    ["milliseconds", "2026-10-30T09:00:00.123+09:00", "2026-10-30T00:00:00.123Z"],
    ["already UTC", "2026-10-30T00:00:00Z", "2026-10-30T00:00:00.000Z"],
  ])("converts %s", (_description, input, expected) => {
    expect(localDateTimeToUtc(input)).toBe(expected);
  });

  it.each([
    "",
    "not-a-date",
    "2026-10-30",
    "2026-10-30T09:00:00",
    "2026-02-30T09:00:00+09:00",
    "2025-02-29T09:00:00+09:00",
    "2026-13-01T09:00:00+09:00",
    "2026-10-30T25:00:00+09:00",
    "2026-10-30T09:60:00+09:00",
    "2026-10-30T09:00:00+24:00",
    "2026-10-30T09:00:00+09:60",
  ])("rejects invalid or ambiguous input: %s", (input) => {
    expect(() => localDateTimeToUtc(input)).toThrow(RangeError);
  });
});
