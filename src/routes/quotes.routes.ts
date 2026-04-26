import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import {
  createQuote,
  getQuoteForUser,
  listQuotesForUser,
  listTopPairsForUser,
} from "../services/quote.service";
import { SUPPORTED_CURRENCIES } from "../lib/currencies";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  sourceCurrency: z.enum(SUPPORTED_CURRENCIES),
  targetCurrency: z.enum(SUPPORTED_CURRENCIES),
  sourceAmount: z.number().positive().max(1_000_000_000),
});

router.get("/", async (req, res, next) => {
  try {
    const quotes = await listQuotesForUser(req.userId!);
    res.json({ quotes });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const result = await createQuote({
      userId: req.userId!,
      sourceCurrency: body.sourceCurrency,
      targetCurrency: body.targetCurrency,
      sourceAmount: body.sourceAmount,
    });
    res.status(201).json({
      quote: result.quote,
      cacheStatus: result.cacheStatus,
    });
  } catch (err) {
    next(err);
  }
});

// IMPORTANT: register before /:id so it isn't shadowed.
router.get("/top-pairs", async (req, res, next) => {
  try {
    const pairs = await listTopPairsForUser(req.userId!);
    res.json({ pairs });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const quote = await getQuoteForUser(req.params.id, req.userId!);
    res.json({ quote });
  } catch (err) {
    next(err);
  }
});

export default router;
