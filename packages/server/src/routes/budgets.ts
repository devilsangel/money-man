import { Router } from "express";
import { db } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { CreateBudgetSchema } from "@money-man/shared";

export const budgetsRouter = Router();

budgetsRouter.get("/", (req, res) => {
  const { month } = req.query as { month?: string };
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);

  const rows = db
    .prepare(
      `SELECT
         b.*,
         c.name  AS category_name,
         c.color AS category_color,
         c.icon  AS category_icon,
         COALESCE(ABS(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
        AND strftime('%Y-%m', t.date) = ?
        AND t.type = 'expense'
       WHERE b.month = ?
       GROUP BY b.id
       ORDER BY c.name ASC`
    )
    .all(targetMonth, targetMonth);

  res.json(rows);
});

budgetsRouter.post("/", validate(CreateBudgetSchema), (req, res) => {
  const { category_id, amount, month } = req.body;

  db.prepare(
    `INSERT INTO budgets (category_id, amount, month) VALUES (?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET amount = excluded.amount`
  ).run(category_id, amount, month);

  const row = db
    .prepare(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.category_id = ? AND b.month = ?`
    )
    .get(category_id, month);

  res.status(201).json(row);
});

budgetsRouter.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM budgets WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  db.prepare("DELETE FROM budgets WHERE id = ?").run(req.params.id);
  res.status(204).end();
});
