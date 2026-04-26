import { Op } from "sequelize";
import {
  HistoricalRateSeries,
  type RateRange,
  type RateSeriesPoint,
} from "../models/HistoricalRateSeries";
import { badRequest, upstreamUnavailable } from "../lib/errors";
import { HttpError } from "../lib/errors";

const PROVIDER = "frankfurter";
const TTL_MS = 60 * 60 * 1000; // 1 hour

const RANGE_DAYS: Record<RateRange, number> = {
  "1W": 7,
  "1M": 30,
  "6M": 180,
};

export interface RateSeriesResult {
  source: string;
  target: string;
  range: RateRange;
  startDate: string;
  endDate: string;
  points: RateSeriesPoint[];
  cacheStatus: "hit" | "miss";
}

type FrankfurterResponse = {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

export type FetchSeriesFn = (
  base: string,
  target: string,
  startDate: string,
  endDate: string
) => Promise<FrankfurterResponse>;

async function defaultFetchSeries(
  base: string,
  target: string,
  startDate: string,
  endDate: string
): Promise<FrankfurterResponse> {
  const url = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=${base}&symbols=${target}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as FrankfurterResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function transformResponse(
  res: FrankfurterResponse,
  target: string
): RateSeriesPoint[] {
  return Object.entries(res.rates)
    .map(([date, rates]) => ({ date, rate: rates[target] }))
    .filter((p) => typeof p.rate === "number" && p.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function findFreshSeries(
  source: string,
  target: string,
  range: RateRange
) {
  return HistoricalRateSeries.findOne({
    where: {
      sourceCurrency: source,
      targetCurrency: target,
      range,
      provider: PROVIDER,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["fetchedAt", "DESC"]],
  });
}

export async function getHistoricalSeries(
  sourceCurrency: string,
  targetCurrency: string,
  range: RateRange,
  fetchSeries: FetchSeriesFn = defaultFetchSeries
): Promise<RateSeriesResult> {
  if (sourceCurrency === targetCurrency) {
    throw badRequest("Source and target currencies must differ");
  }

  const fresh = await findFreshSeries(sourceCurrency, targetCurrency, range);
  if (fresh) {
    const points = fresh.data.points;
    return {
      source: sourceCurrency,
      target: targetCurrency,
      range,
      startDate: points[0]?.date ?? "",
      endDate: points[points.length - 1]?.date ?? "",
      points,
      cacheStatus: "hit",
    };
  }

  const days = RANGE_DAYS[range];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startDate = ymd(start);
  const endDate = ymd(end);

  try {
    const response = await fetchSeries(
      sourceCurrency,
      targetCurrency,
      startDate,
      endDate
    );
    const points = transformResponse(response, targetCurrency);
    if (points.length < 2) {
      throw new Error(
        `Provider returned insufficient points for ${sourceCurrency}→${targetCurrency}`
      );
    }

    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + TTL_MS);
    await HistoricalRateSeries.create({
      sourceCurrency,
      targetCurrency,
      range,
      provider: PROVIDER,
      data: { points, raw: response as unknown as Record<string, unknown> },
      fetchedAt,
      expiresAt,
    });

    return {
      source: sourceCurrency,
      target: targetCurrency,
      range,
      startDate: points[0].date,
      endDate: points[points.length - 1].date,
      points,
      cacheStatus: "miss",
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("[historicalRate] provider call failed:", err);
    throw upstreamUnavailable(
      "Historical rate provider is unavailable. Please try again shortly."
    );
  }
}
