import { describe, expect, it } from "vitest";
import { fitWithin } from "./images";

describe("fitWithin", () => {
  it("scales the longer side down to the limit, keeping the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small image", () => {
    expect(fitWithin(640, 480, 1600)).toEqual({ width: 640, height: 480 });
  });

  it("keeps very thin images at least one pixel wide", () => {
    expect(fitWithin(10000, 2, 1600)).toEqual({ width: 1600, height: 1 });
  });
});
