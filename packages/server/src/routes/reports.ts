import { Router } from "express";
import { db } from "../db/client.js";

export const reportsRouter = Router();

reportsRouter.get("/spending-by-category", (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };

  const conditions: string[] = ["t.type = 'expense'"];
  const params: unknown[] = [];

  if (from) { conditions.push("t.date >= ?"); params.push(from); }
  if (to)   { conditions.push("t.date <= ?"); params.push(to); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT
         c.id    AS category_id,
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(c.color, '#8E8E93')      AS color,
         ABS(SUM(t.amount))               AS total_cents
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       ${where}
       GROUP BY t.category_id
       ORDER BY total_cents DESC`
    )
    .all(...params);

  res.json(rows);
});

reportsRouter.get("/spending-by-month", (req, res) => {
  const { year } = req.query as { year?: string };
  const targetYear = year ?? new Date().getFullYear().toString();

  const rows = db
    .prepare(
      `SELECT
         strftime('%Y-%m', date) AS month,
         SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END)       AS income_cents,
         ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END))  AS expense_cents,
         SUM(CASE WHEN type IN ('income','expense') THEN amount ELSE 0 END) AS net_cents
       FROM transactions
       WHERE strftime('%Y', date) = ?
         AND type IN ('income', 'expense')
       GROUP BY month
       ORDER BY month ASC`
    )
    .all(targetYear);

  res.json(rows);
});

reportsRouter.get("/account-balance-history", (req, res) => {
  const { account_id, from, to } = req.query as {
    account_id?: string;
    from?: string;
    to?: string;
  };

  if (!account_id) {
    res.status(400).json({ error: "account_id is required" });
    return;
  }

  const account = db
    .prepare("SELECT initial_balance FROM accounts WHERE id = ?")
    .get(account_id) as { initial_balance: number } | undefined;

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const conditions = ["account_id = ?"];
  const params: unknown[] = [account_id];

  if (from) { conditions.push("date >= ?"); params.push(from); }
  if (to)   { conditions.push("date <= ?"); params.push(to); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT
         date,
         SUM(amount) OVER (ORDER BY date, id ROWS UNBOUNDED PRECEDING) + ? AS running_balance_cents
       FROM transactions
       ${where}
       ORDER BY date ASC, id ASC`
    )
    .all(account.initial_balance, ...params);

  res.json(rows);
});
