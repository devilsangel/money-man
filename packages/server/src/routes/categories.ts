import { Router } from "express";
import { db } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { CreateCategorySchema, UpdateCategorySchema } from "@money-man/shared";

export const categoriesRouter = Router();

categoriesRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  res.json(rows);
});

categoriesRouter.post("/", validate(CreateCategorySchema), (req, res) => {
  const { name, color, icon } = req.body;
  const result = db
    .prepare("INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)")
    .run(name, color, icon ?? null);
  const row = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

categoriesRouter.patch("/:id", validate(UpdateCategorySchema), (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body;

  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (color !== undefined) { fields.push("color = ?"); values.push(color); }
  if (icon !== undefined) { fields.push("icon = ?"); values.push(icon); }

  if (fields.length === 0) {
    res.json(existing);
    return;
  }

  values.push(id);
  db.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  res.json(updated);
});

categoriesRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.status(204).end();
});
