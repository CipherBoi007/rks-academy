import { describe, expect, it } from "vitest";
import { digitsOnly, mobileDigits } from "./forms";

describe("mobileDigits", () => {
  it("keeps digits only and stops at 10", () => {
    expect(mobileDigits("98765abc43210")).toBe("9876543210");
    expect(mobileDigits("98765 43210 999")).toBe("9876543210");
  });

  it("drops a pasted +91 or leading 0", () => {
    expect(mobileDigits("+91 98765 43210")).toBe("9876543210");
    expect(mobileDigits("+91-98765-43210")).toBe("9876543210");
    expect(mobileDigits("09876543210")).toBe("9876543210");
  });

  it("never mangles a number that starts with 91 when an extra digit is typed", () => {
    expect(mobileDigits("9123456789")).toBe("9123456789");
    expect(mobileDigits("91234567890")).toBe("9123456789");
  });

  it("leaves a partly typed number alone", () => {
    expect(mobileDigits("98")).toBe("98");
    expect(mobileDigits("")).toBe("");
  });
});

describe("digitsOnly", () => {
  it("keeps up to the limit of digits", () => {
    expect(digitsOnly("12a3 4567", 6)).toBe("123456");
    expect(digitsOnly("abcd", 6)).toBe("");
  });
});
