/**
 * Cache-hit / cache-miss / error tests for historicalRate.service.
 * Mocks the model module with an in-memory store and the sequelize Op
 * symbols so we can read where-clause filters as plain keys.
 */

type Snapshot = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  range: "1W" | "1M" | "6M";
  provider: string;
  data: { points: Array<{ date: string; rate: number }>; raw: Record<string, unknown> };
  fetchedAt: Date;
  expiresAt: Date;
};

const store: Snapshot[] = [];

jest.mock("../src/models/HistoricalRateSeries", () => {
  return {
    HistoricalRateSeries: {
      findOne: jest.fn(async (opts: any) => {
        const where = opts.where ?? {};
        const candidates = store
          .filter(
            (s) =>
              s.sourceCurrency === where.sourceCurrency &&
              s.targetCurrency === where.targetCurrency &&
              s.range === where.range &&
              s.provider === where.provider
          )
          .filter((s) => {
            const expClause = (where.expiresAt as any)?.gt;
            if (expClause && !(s.expiresAt > expClause)) return false;
            return true;
          })
          .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime());
        return candidates[0] ?? null;
      }),
      create: jest.fn(async (data: Omit<Snapshot, "id">) => {
        const snap: Snapshot = { ...data, id: `snap-${store.length + 1}` };
        store.push(snap);
        return snap;
      }),
    },
  };
});

jest.mock("sequelize", () => {
  const actual = jest.requireActual("sequelize");
  return {
    ...actual,
    Op: new Proxy({}, { get: (_t, prop) => prop }),
  };
});

import { getHistoricalSeries } from "../src/services/historicalRate.service";

const fakeResponse = (
  base: string,
  target: string,
  pairs: Array<[string, number]>
) => ({
  amount: 1,
  base,
  start_date: pairs[0][0],
  end_date: pairs[pairs.length - 1][0],
  rates: Object.fromEntries(pairs.map(([d, r]) => [d, { [target]: r }])),
});

beforeEach(() => {
  store.length = 0;
  jest.clearAllMocks();
});

describe("historicalRate.service.getHistoricalSeries", () => {
  it("calls the provider on cache miss and persists a series row", async () => {
    const fetcher = jest.fn(async () =>
      fakeResponse("USD", "PHP", [
        ["2026-04-01", 56.1],
        ["2026-04-02", 56.3],
        ["2026-04-03", 56.5],
      ])
    );
    const result = await getHistoricalSeries("USD", "PHP", "1M", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("miss");
    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual({ date: "2026-04-01", rate: 56.1 });
    expect(store).toHaveLength(1);
  });

  it("returns the cached series on second call within TTL", async () => {
    const fetcher = jest.fn(async () =>
      fakeResponse("USD", "PHP", [
        ["2026-04-01", 56.1],
        ["2026-04-02", 56.3],
      ])
    );
    await getHistoricalSeries("USD", "PHP", "1M", fetcher);
    fetcher.mockClear();

    const second = await getHistoricalSeries("USD", "PHP", "1M", fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(second.cacheStatus).toBe("hit");
    expect(store).toHaveLength(1);
  });

  it("rejects same source and target", async () => {
    const fetcher = jest.fn();
    await expect(
      getHistoricalSeries("USD", "USD", "1M", fetcher as any)
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("treats different ranges as separate cache keys", async () => {
    const fetcher = jest.fn(async () =>
      fakeResponse("USD", "PHP", [
        ["2026-04-01", 56.1],
        ["2026-04-02", 56.3],
      ])
    );
    await getHistoricalSeries("USD", "PHP", "1W", fetcher);
    await getHistoricalSeries("USD", "PHP", "1M", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(store).toHaveLength(2);
  });

  it("throws upstream_unavailable when the provider fails and there's no cache", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("network down");
    });
    await expect(
      getHistoricalSeries("USD", "PHP", "1M", fetcher)
    ).rejects.toMatchObject({ status: 503 });
  });
});
