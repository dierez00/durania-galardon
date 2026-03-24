import { describe, expect, it } from "vitest";
import { resolveProducerAccessDebugEnabled } from "../../src/server/debug/producerAccess";

describe("resolveProducerAccessDebugEnabled", () => {
  it("returns false when no debug flag is enabled", () => {
    expect(resolveProducerAccessDebugEnabled({})).toBe(false);
  });

  it("returns true when DEBUG_PRODUCER_ACCESS is enabled", () => {
    expect(resolveProducerAccessDebugEnabled({ DEBUG_PRODUCER_ACCESS: "1" })).toBe(true);
  });

  it("returns true when NEXT_PUBLIC_DEBUG_PRODUCER_ACCESS is enabled", () => {
    expect(
      resolveProducerAccessDebugEnabled({ NEXT_PUBLIC_DEBUG_PRODUCER_ACCESS: "1" })
    ).toBe(true);
  });
});
