import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import {
  getTransferForUser,
  listTransfersForUser,
  submitTransferFromQuote,
} from "../services/quote.service";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  quoteId: z.string().uuid(),
  recipientName: z.string().trim().min(1).max(255).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const transfers = await listTransfersForUser(req.userId!);
    res.json({ transfers });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const transfer = await submitTransferFromQuote({
      userId: req.userId!,
      quoteId: body.quoteId,
      recipientName: body.recipientName,
    });
    res.status(201).json({ transfer });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const transfer = await getTransferForUser(req.params.id, req.userId!);
    res.json({ transfer });
  } catch (err) {
    next(err);
  }
});

export default router;
