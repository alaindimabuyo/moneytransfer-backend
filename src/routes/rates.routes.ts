import { Router } from "express";
import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../lib/currencies";
import { getHistoricalSeries } from "../services/historicalRate.service";

const router = Router();

const querySchema = z.object({
  source: z.enum(SUPPORTED_CURRENCIES),
  target: z.enum(SUPPORTED_CURRENCIES),
  range: z.enum(["1W", "1M", "6M"]).default("1M"),
});

// Public endpoint — historical rates aren't user-scoped data.
router.get("/history", async (req, res, next) => {
  try {
    const { source, target, range } = querySchema.parse(req.query);
    const series = await getHistoricalSeries(source, target, range);
    res.json({ series });
  } catch (err) {
    next(err);
  }
});

export default router;
