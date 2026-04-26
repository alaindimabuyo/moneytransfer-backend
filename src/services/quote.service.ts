import { Quote, RateSnapshot, TransferRequest, sequelize } from "../models";
import { getRate } from "./exchangeRate.service";
import { isSupportedCurrency } from "../lib/currencies";
import { badRequest, notFound, conflict } from "../lib/errors";
import { col, fn, literal } from "sequelize";

const QUOTE_VALIDITY_MINUTES = 10;
const FEE_PERCENT = 0.005; // 0.5%
const FEE_FLOOR = 1.99;

/**
 * Pure quote arithmetic. Kept as a standalone function so it can be unit
 * tested without the database. All inputs/outputs use 2-decimal-place
 * strings to avoid floating point surprises in the API response.
 */
export function calculateQuote(args: {
  sourceAmount: number;
  rate: number;
}): { feeAmount: number; targetAmount: number } {
  const { sourceAmount, rate } = args;
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    throw badRequest("sourceAmount must be a positive number");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw badRequest("rate must be a positive number");
  }
  const fee = Math.max(FEE_FLOOR, sourceAmount * FEE_PERCENT);
  const target = (sourceAmount - fee) * rate;
  return {
    feeAmount: round2(fee),
    targetAmount: round2(Math.max(target, 0)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createQuote(args: {
  userId: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
}) {
  const sourceCurrency = args.sourceCurrency.toUpperCase();
  const targetCurrency = args.targetCurrency.toUpperCase();
  if (
    !isSupportedCurrency(sourceCurrency) ||
    !isSupportedCurrency(targetCurrency)
  ) {
    throw badRequest("Unsupported currency");
  }

  const { snapshot, cacheStatus } = await getRate(
    sourceCurrency,
    targetCurrency
  );
  const rate = Number(snapshot.rate);
  const { feeAmount, targetAmount } = calculateQuote({
    sourceAmount: args.sourceAmount,
    rate,
  });

  const expiresAt = new Date(Date.now() + QUOTE_VALIDITY_MINUTES * 60 * 1000);

  const quote = await Quote.create({
    userId: args.userId,
    rateSnapshotId: snapshot.id,
    sourceCurrency,
    targetCurrency,
    sourceAmount: args.sourceAmount.toFixed(2),
    targetAmount: targetAmount.toFixed(2),
    feeAmount: feeAmount.toFixed(2),
    rate: rate.toString(),
    expiresAt,
    status: "active",
  });

  return { quote, snapshot, cacheStatus };
}

export async function getQuoteForUser(quoteId: string, userId: string) {
  const quote = await Quote.findOne({
    where: { id: quoteId, userId },
    include: [{ model: RateSnapshot, as: "rateSnapshot" }],
  });
  if (!quote) throw notFound("Quote not found");
  return quote;
}

export async function listQuotesForUser(userId: string) {
  return Quote.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Top N (default 3) most-used currency pairs for a user, derived from their
 * quote history. Returned in descending count order. Empty array if the user
 * has no quotes yet — the frontend should hide the chips entirely in that case.
 */
export async function listTopPairsForUser(userId: string, limit = 3) {
  const rows = (await Quote.findAll({
    where: { userId },
    attributes: [
      "sourceCurrency",
      "targetCurrency",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["sourceCurrency", "targetCurrency"],
    order: [[literal('"count"'), "DESC"]],
    limit,
    raw: true,
  })) as unknown as Array<{
    sourceCurrency: string;
    targetCurrency: string;
    count: string;
  }>;
  return rows.map((r) => ({
    sourceCurrency: r.sourceCurrency,
    targetCurrency: r.targetCurrency,
    count: Number(r.count),
  }));
}

export async function submitTransferFromQuote(args: {
  userId: string;
  quoteId: string;
  recipientName: string;
  recipientAccount?: string;
  recipientCountry?: string;
  recipientEmail?: string;
}) {
  return sequelize.transaction(async (tx) => {
    const quote = await Quote.findOne({
      where: { id: args.quoteId, userId: args.userId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!quote) throw notFound("Quote not found");
    if (quote.status === "consumed") {
      throw conflict("This quote has already been submitted");
    }
    if (quote.status === "expired" || quote.expiresAt.getTime() < Date.now()) {
      // mark expired idempotently
      if (quote.status !== "expired") {
        quote.status = "expired";
        await quote.save({ transaction: tx });
      }
      throw conflict("This quote has expired");
    }

    const transfer = await TransferRequest.create(
      {
        userId: args.userId,
        quoteId: quote.id,
        status: "pending",
        submittedAt: new Date(),
        recipientName: args.recipientName,
        recipientAccount: args.recipientAccount ?? null,
        recipientCountry: args.recipientCountry ?? null,
        recipientEmail: args.recipientEmail ?? null,
      },
      { transaction: tx }
    );

    quote.status = "consumed";
    await quote.save({ transaction: tx });

    return transfer;
  });
}

export async function listTransfersForUser(userId: string) {
  return TransferRequest.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    include: [{ model: Quote, as: "quote" }],
  });
}

export async function getTransferForUser(transferId: string, userId: string) {
  const transfer = await TransferRequest.findOne({
    where: { id: transferId, userId },
    include: [{ model: Quote, as: "quote" }],
  });
  if (!transfer) throw notFound("Transfer not found");
  return transfer;
}
