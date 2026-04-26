import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { sequelize } from "./models";
import authRoutes from "./routes/auth.routes";
import quotesRoutes from "./routes/quotes.routes";
import transfersRoutes from "./routes/transfers.routes";
import metaRoutes from "./routes/meta.routes";
import ratesRoutes from "./routes/rates.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/quotes", quotesRoutes);
app.use("/api/transfers", transfersRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/rates", ratesRoutes);

app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("[db] connected");
  } catch (err) {
    console.error("[db] connection failed:", err);
    process.exit(1);
  }
  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

if (require.main === module) {
  start();
}

export { app };
