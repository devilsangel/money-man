import { Router } from "express";
import { db } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { CreateTransactionSchema, UpdateTransactionSchema } from "@money-man/shared";

export const transactionsRouter = Router();

transactionsRouter.get("/", (req, res) => {
  const {
    account_id,
    category_id,
    from,
    to,
    type,
    q,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (account_id) {
    conditions.push("t.account_id = ?");
    params.push(account_id);
  }
  if (category_id) {
    conditions.push("t.category_id = ?");
    params.push(category_id);
  }
  if (from) {
    conditions.push("t.date >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("t.date <= ?");
    params.push(to);
  }
  if (type) {
    conditions.push("t.type = ?");
    params.push(type);
  }
  if (q) {
    conditions.push("(t.payee LIKE ? OR t.notes LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total FROM transactions t ${where}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT t.*,
         c.name  AS category_name,
         c.color AS category_color,
         a.name  AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts   a ON a.id = t.account_id
       ${where}
       ORDER BY t.date DESC, t.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limitNum, offset);

  res.json({ data: rows, total: countRow.total, page: pageNum, limit: limitNum });
});

transactionsRouter.get("/export", (req, res) => {
  const { account_id, category_id, from, to, type, q, format = "csv" } =
    req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (account_id) { conditions.push("t.account_id = ?"); params.push(account_id); }
  if (category_id) { conditions.push("t.category_id = ?"); params.push(category_id); }
  if (from) { conditions.push("t.date >= ?"); params.push(from); }
  if (to) { conditions.push("t.date <= ?"); params.push(to); }
  if (type) { conditions.push("t.type = ?"); params.push(type); }
  if (q) { conditions.push("(t.payee LIKE ? OR t.notes LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT t.date, t.type, t.amount, t.payee, t.notes,
         c.name AS category, a.name AS account
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts   a ON a.id = t.account_id
       ${where}
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(...params) as Record<string, unknown>[];

  if (format === "json") {
    res.setHeader("Content-Disposition", 'attachment; filename="transactions.json"');
    res.setHeader("Content-Type", "application/json");
    res.json(rows);
    return;
  }

  // CSV format
  const headers = ["date", "type", "amount", "payee", "notes", "category", "account"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = h === "amount" ? ((r[h] as number) / 100).toFixed(2) : r[h];
        return escape(val);
      }).join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

transactionsRouter.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts   a ON a.id = t.account_id
       WHERE t.id = ?`
    )
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(row);
});

transactionsRouter.post("/", validate(CreateTransactionSchema), (req, res) => {
  const { account_id, category_id, amount, payee, notes, date, type, to_account_id } =
    req.body;

  if (type === "transfer") {
    if (!to_account_id) {
      res.status(400).json({ error: "to_account_id required for transfers" });
      return;
    }

    const insertTransfer = db.transaction(() => {
      const debit = db
        .prepare(
          `INSERT INTO transactions (account_id, category_id, amount, payee, notes, date, type)
           VALUES (?, ?, ?, ?, ?, ?, 'transfer')`
        )
        .run(account_id, category_id ?? null, -Math.abs(amount), payee ?? null, notes ?? null, date);

      const credit = db
        .prepare(
          `INSERT INTO transactions (account_id, category_id, amount, payee, notes, date, type, transfer_id)
           VALUES (?, ?, ?, ?, ?, ?, 'transfer', ?)`
        )
        .run(to_account_id, category_id ?? null, Math.abs(amount), payee ?? null, notes ?? null, date, debit.lastInsertRowid);

      db.prepare("UPDATE transactions SET transfer_id = ? WHERE id = ?").run(
        credit.lastInsertRowid,
        debit.lastInsertRowid
      );

      return db.prepare("SELECT * FROM transactions WHERE id = ?").get(debit.lastInsertRowid);
    });

    const result = insertTransfer();
    res.status(201).json(result);
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO transactions (account_id, category_id, amount, payee, notes, date, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(account_id, category_id ?? null, amount, payee ?? null, notes ?? null, date, type);

  const row = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts   a ON a.id = t.account_id
       WHERE t.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(row);
});

transactionsRouter.patch("/:id", validate(UpdateTransactionSchema), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const { account_id, category_id, amount, payee, notes, date, type } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (account_id !== undefined) { fields.push("account_id = ?"); values.push(account_id); }
  if (category_id !== undefined) { fields.push("category_id = ?"); values.push(category_id); }
  if (amount !== undefined) { fields.push("amount = ?"); values.push(amount); }
  if (payee !== undefined) { fields.push("payee = ?"); values.push(payee); }
  if (notes !== undefined) { fields.push("notes = ?"); values.push(notes); }
  if (date !== undefined) { fields.push("date = ?"); values.push(date); }
  if (type !== undefined) { fields.push("type = ?"); values.push(type); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts   a ON a.id = t.account_id
       WHERE t.id = ?`
    )
    .get(id);
  res.json(updated);
});

transactionsRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare("SELECT * FROM transactions WHERE id = ?")
    .get(id) as { transfer_id: number | null } | undefined;
  if (!existing) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  db.transaction(() => {
    if (existing.transfer_id) {
      db.prepare("DELETE FROM transactions WHERE id = ?").run(existing.transfer_id);
    }
    db.prepare("DELETE FROM transactions WHERE transfer_id = ?").run(id);
    db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  })();

  res.status(204).end();
});
