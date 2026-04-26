import { Router } from "express";
import { SUPPORTED_CURRENCIES } from "../lib/currencies";

const router = Router();

router.get("/currencies", (_req, res) => {
  res.json({ currencies: SUPPORTED_CURRENCIES });
});

export default router;
