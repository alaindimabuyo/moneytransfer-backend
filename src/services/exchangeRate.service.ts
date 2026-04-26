import { Op } from "sequelize";
import { RateSnapshot } from "../models";
import { env } from "../config/env";
import { upstreamUnavailable, badRequest } from "../lib/errors";

const PROVIDER = "exchangerate-api";
const STALE_FALLBACK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface RateResult {
  snapshot: RateSnapshot;
  cacheStatus: "hit" | "miss" | "stale_fallback";
}

type ProviderResponse = {
  result: string;
  conversion_rates?: Record<string, number>;
  "error-type"?: string;
};

// Allow injection so tests can stub the network call.
export type FetchRatesFn = (base: string) => Promise<ProviderResponse>;

async function defaultFetchRates(base: string): Promise<ProviderResponse> {
  if (!env.exchangeRateApiKey) {
    throw badRequest(
      "EXCHANGE_RATE_API_KEY is not configured. See backend/.env.example."
    );
  }
  const url = `https://v6.exchangerate-api.com/v6/${env.exchangeRateApiKey}/latest/${base}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as ProviderResponse;
    if (json.result !== "success") {
      throw new Error(json["error-type"] ?? "provider_error");
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function findFreshSnapshot(source: string, target: string) {
  return RateSnapshot.findOne({
    where: {
      sourceCurrency: source,
      targetCurrency: target,
      provider: PROVIDER,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["fetchedAt", "DESC"]],
  });
}

async function findStaleSnapshot(source: string, target: string) {
  const cutoff = new Date(Date.now() - STALE_FALLBACK_MAX_AGE_MS);
  return RateSnapshot.findOne({
    where: {
      sourceCurrency: source,
      targetCurrency: target,
      provider: PROVIDER,
      fetchedAt: { [Op.gt]: cutoff },
    },
    order: [["fetchedAt", "DESC"]],
  });
}

export async function getRate(
  sourceCurrency: string,
  targetCurrency: string,
  fetchRates: FetchRatesFn = defaultFetchRates
): Promise<RateResult> {
  if (sourceCurrency === targetCurrency) {
    throw badRequest("Source and target currencies must differ");
  }

  const fresh = await findFreshSnapshot(sourceCurrency, targetCurrency);
  if (fresh) return { snapshot: fresh, cacheStatus: "hit" };

  try {
    const response = await fetchRates(sourceCurrency);
    const rate = response.conversion_rates?.[targetCurrency];
    if (typeof rate !== "number" || rate <= 0) {
      throw new Error(`Provider did not return a rate for ${targetCurrency}`);
    }
    const fetchedAt = new Date();
    const expiresAt = new Date(
      fetchedAt.getTime() + env.exchangeRateCacheTtlMinutes * 60 * 1000
    );
    const snapshot = await RateSnapshot.create({
      sourceCurrency,
      targetCurrency,
      rate: rate.toString(),
      provider: PROVIDER,
      rawResponse: response as unknown as Record<string, unknown>,
      fetchedAt,
      expiresAt,
    });
    return { snapshot, cacheStatus: "miss" };
  } catch (err) {
    console.error("[exchangeRate] provider call failed:", err);
    const stale = await findStaleSnapshot(sourceCurrency, targetCurrency);
    if (stale) {
      console.warn(
        `[exchangeRate] using stale snapshot ${stale.id} (fetched_at=${stale.fetchedAt.toISOString()})`
      );
      return { snapshot: stale, cacheStatus: "stale_fallback" };
    }
    throw upstreamUnavailable(
      "Exchange rate provider is unavailable and no recent snapshot exists"
    );
  }
}
