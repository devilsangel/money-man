import { Router } from "express";
import { db } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { CreateAccountSchema, UpdateAccountSchema } from "@money-man/shared";

export const accountsRouter = Router();

const BALANCE_SQL = `
  SELECT
    a.*,
    a.initial_balance + COALESCE(SUM(t.amount), 0) AS balance
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  WHERE a.archived_at IS NULL
  GROUP BY a.id
  ORDER BY a.created_at ASC
`;

accountsRouter.get("/", (_req, res) => {
  const rows = db.prepare(BALANCE_SQL).all();
  res.json(rows);
});

accountsRouter.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT a.*,
        a.initial_balance + COALESCE(SUM(t.amount), 0) AS balance
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.id = ?
       GROUP BY a.id`
    )
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(row);
});

accountsRouter.post("/", validate(CreateAccountSchema), (req, res) => {
  const { name, type, currency, initial_balance } = req.body;
  const result = db
    .prepare(
      "INSERT INTO accounts (name, type, currency, initial_balance) VALUES (?, ?, ?, ?)"
    )
    .run(name, type, currency ?? "USD", initial_balance ?? 0);
  const row = db
    .prepare(
      `SELECT a.*, a.initial_balance AS balance FROM accounts a WHERE a.id = ?`
    )
    .get(result.lastInsertRowid);
  res.status(201).json(row);
});

accountsRouter.patch("/:id", validate(UpdateAccountSchema), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { name, type, currency, initial_balance } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (type !== undefined) { fields.push("type = ?"); values.push(type); }
  if (currency !== undefined) { fields.push("currency = ?"); values.push(currency); }
  if (initial_balance !== undefined) { fields.push("initial_balance = ?"); values.push(initial_balance); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE accounts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT a.*, a.initial_balance + COALESCE(SUM(t.amount), 0) AS balance
       FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.id = ? GROUP BY a.id`
    )
    .get(id);
  res.json(updated);
});

accountsRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  db.prepare("UPDATE accounts SET archived_at = datetime('now') WHERE id = ?").run(id);
  res.status(204).end();
});
