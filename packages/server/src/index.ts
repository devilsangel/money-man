import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./db/migrate.js";
import { errorHandler } from "./middleware/error.js";
import { categoriesRouter } from "./routes/categories.js";
import { accountsRouter } from "./routes/accounts.js";
import { transactionsRouter } from "./routes/transactions.js";
import { budgetsRouter } from "./routes/budgets.js";
import { reportsRouter } from "./routes/reports.js";
import { importRouter } from "./routes/import.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run DB migrations on startup
runMigrations();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/v1/categories",   categoriesRouter);
app.use("/api/v1/accounts",     accountsRouter);
app.use("/api/v1/transactions", transactionsRouter);
app.use("/api/v1/budgets",      budgetsRouter);
app.use("/api/v1/reports",      reportsRouter);
app.use("/api/v1/import",       importRouter);

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static frontend in production
const clientDist = path.join(__dirname, "../../client/dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Running at http://localhost:${PORT}`);
});
