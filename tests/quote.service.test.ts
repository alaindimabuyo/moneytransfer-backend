import { calculateQuote } from "../src/services/quote.service";

describe("calculateQuote", () => {
  it("uses the percentage fee when it exceeds the floor", () => {
    // 1000 * 0.005 = 5.00 (above 1.99 floor)
    const result = calculateQuote({ sourceAmount: 1000, rate: 0.92 });
    expect(result.feeAmount).toBe(5);
    // (1000 - 5) * 0.92 = 915.4
    expect(result.targetAmount).toBe(915.4);
  });

  it("uses the floor fee when the percentage is smaller", () => {
    // 100 * 0.005 = 0.50 (below 1.99 floor)
    const result = calculateQuote({ sourceAmount: 100, rate: 1.25 });
    expect(result.feeAmount).toBe(1.99);
    // (100 - 1.99) * 1.25 = 122.5125 -> 122.51
    expect(result.targetAmount).toBe(122.51);
  });

  it("rejects non-positive amounts", () => {
    expect(() => calculateQuote({ sourceAmount: 0, rate: 1 })).toThrow();
    expect(() => calculateQuote({ sourceAmount: -1, rate: 1 })).toThrow();
  });

  it("rejects non-positive rates", () => {
    expect(() => calculateQuote({ sourceAmount: 100, rate: 0 })).toThrow();
    expect(() => calculateQuote({ sourceAmount: 100, rate: -1 })).toThrow();
  });

  it("clamps target amount at zero when fee exceeds source amount", () => {
    // sourceAmount of 1.00 -> fee floor 1.99, so net negative
    const result = calculateQuote({ sourceAmount: 1, rate: 1 });
    expect(result.feeAmount).toBe(1.99);
    expect(result.targetAmount).toBe(0);
  });
});
