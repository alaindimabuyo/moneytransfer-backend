/**
 * Cache-hit / cache-miss / stale-fallback tests for exchangeRate.service.
 *
 * We avoid touching the real Postgres database by mocking the model module
 * with an in-memory store. This keeps the test focused on the caching
 * decision logic rather than Sequelize internals.
 */

type Snapshot = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: string;
  provider: string;
  rawResponse: Record<string, unknown>;
  fetchedAt: Date;
  expiresAt: Date;
};

const store: Snapshot[] = [];

jest.mock("../src/models", () => {
  return {
    RateSnapshot: {
      findOne: jest.fn(async (opts: any) => {
        const where = opts.where ?? {};
        const now = new Date();
        const candidates = store
          .filter(
            (s) =>
              s.sourceCurrency === where.sourceCurrency &&
              s.targetCurrency === where.targetCurrency &&
              s.provider === where.provider
          )
          .filter((s) => {
            const expGt = where.expiresAt?.[Symbol.for("gt")];
            const fetchedGt = where.fetchedAt?.[Symbol.for("gt")];
            // We can't easily read Op symbols from outside Sequelize, so
            // we check both expiresAt and fetchedAt clauses if they were
            // attached as plain Date values via the matcher above.
            const expClause = (where.expiresAt as any)?.gt;
            const fetchedClause = (where.fetchedAt as any)?.gt;
            if (expClause && !(s.expiresAt > expClause)) return false;
            if (fetchedClause && !(s.fetchedAt > fetchedClause)) return false;
            void now;
            void expGt;
            void fetchedGt;
            return true;
          })
          .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime());
        return candidates[0] ?? null;
      }),
      create: jest.fn(async (data: Omit<Snapshot, "id">) => {
        const snap: Snapshot = {
          ...data,
          id: `snap-${store.length + 1}`,
        };
        store.push(snap);
        return snap;
      }),
    },
  };
});

// Replace Sequelize Op symbols with plain `gt` keys so the mock above can
// read them. We patch by re-exporting a simple shim before importing the
// service.
jest.mock("sequelize", () => {
  const actual = jest.requireActual("sequelize");
  return {
    ...actual,
    Op: new Proxy(
      {},
      {
        get: (_t, prop) => prop, // returns the string key, e.g. 'gt'
      }
    ),
  };
});

import { getRate } from "../src/services/exchangeRate.service";

const fakeProviderResponse = (rate: number) => ({
  result: "success",
  conversion_rates: { EUR: rate },
});

beforeEach(() => {
  store.length = 0;
  jest.clearAllMocks();
});

describe("exchangeRate.service.getRate", () => {
  it("calls the provider on cache miss and persists a snapshot", async () => {
    const fetchRates = jest.fn(async () => fakeProviderResponse(0.92));
    const result = await getRate("USD", "EUR", fetchRates);
    expect(fetchRates).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("miss");
    expect(result.snapshot.rate).toBe("0.92");
    expect(store).toHaveLength(1);
  });

  it("does not call the provider on cache hit", async () => {
    // seed a fresh snapshot
    const fetchRates = jest.fn(async () => fakeProviderResponse(0.92));
    await getRate("USD", "EUR", fetchRates);
    fetchRates.mockClear();

    const second = await getRate("USD", "EUR", fetchRates);
    expect(fetchRates).not.toHaveBeenCalled();
    expect(second.cacheStatus).toBe("hit");
    expect(store).toHaveLength(1); // no new row written
  });

  it("falls back to a stale snapshot when the provider fails", async () => {
    // seed an expired-but-recent snapshot manually
    const old = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    store.push({
      id: "snap-stale",
      sourceCurrency: "USD",
      targetCurrency: "EUR",
      rate: "0.90",
      provider: "exchangerate-api",
      rawResponse: {},
      fetchedAt: old,
      expiresAt: new Date(old.getTime() + 5 * 60 * 1000), // expired
    });

    const fetchRates = jest.fn(async () => {
      throw new Error("provider down");
    });
    const result = await getRate("USD", "EUR", fetchRates);
    expect(result.cacheStatus).toBe("stale_fallback");
    expect(result.snapshot.rate).toBe("0.90");
  });

  it("rejects same source and target", async () => {
    const fetchRates = jest.fn();
    await expect(getRate("USD", "USD", fetchRates as any)).rejects.toThrow();
    expect(fetchRates).not.toHaveBeenCalled();
  });
});
