import { describe, expect, it } from "vitest";
import {
  addDays,
  firstOfNextMonth,
  formatDate,
  formatLongDate,
  formatMobile,
  formatPeriod,
  formatTime,
  inr,
  planPeriodLabel,
  weekdayIndex,
} from "./format";

describe("format", () => {
  it("formats rupees with Indian grouping", () => {
    expect(inr(1500)).toBe("₹1,500");
    expect(inr(66900)).toBe("₹66,900");
    expect(inr(125000)).toBe("₹1,25,000");
    expect(inr(3780.5)).toBe("₹3,780.5");
  });

  it("formats calendar dates without timezone drift", () => {
    expect(formatDate("2026-11-05")).toBe("05 Nov 2026");
    expect(formatDate("2026-01-31")).toBe("31 Jan 2026");
    expect(formatLongDate("2026-11-05")).toBe("Thursday, 05 Nov 2026");
  });

  it("formats periods and times", () => {
    expect(formatPeriod("2026-11-01", "2026-11-30")).toBe("Nov 2026");
    expect(formatPeriod("2026-11-01", "2027-01-31")).toBe("Nov 2026 – Jan 2027");
    expect(formatTime("06:00:00")).toBe("6:00 AM");
    expect(formatTime("16:30:00")).toBe("4:30 PM");
    expect(formatTime("12:00:00")).toBe("12:00 PM");
    expect(formatTime("00:15:00")).toBe("12:15 AM");
  });

  it("does date arithmetic on ISO strings", () => {
    expect(addDays("2026-11-05", -5)).toBe("2026-10-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(weekdayIndex("2026-11-02")).toBe(0); // Monday
    expect(weekdayIndex("2026-11-08")).toBe(6); // Sunday
    expect(firstOfNextMonth("2026-11-05")).toBe("2026-12-01");
    expect(firstOfNextMonth("2026-12-31")).toBe("2027-01-01");
  });

  it("formats mobiles and plan periods", () => {
    expect(formatMobile("9000000101")).toBe("+91 90000 00101");
    expect(planPeriodLabel(1)).toBe("per month");
    expect(planPeriodLabel(3)).toBe("per 3 months");
    expect(planPeriodLabel(12)).toBe("per year");
  });
});
