import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import { db } from "../db/client.js";
import { CsvConfirmSchema } from "@money-man/shared";
import { validate } from "../middleware/validate.js";

export const importRouter = Router();

const upload = multer({
  dest: "/tmp/money-man-uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted"));
    }
  },
});

// Common bank CSV column name aliases
const DATE_ALIASES = ["date", "transaction date", "trans date", "posted date", "value date"];
const AMOUNT_ALIASES = ["amount", "transaction amount", "debit/credit amount"];
const PAYEE_ALIASES = ["payee", "description", "merchant", "name", "transaction description"];
const DEBIT_ALIASES = ["debit", "withdrawal", "charge", "debit amount"];
const CREDIT_ALIASES = ["credit", "deposit", "payment", "credit amount"];

function detectColumn(headers: string[], aliases: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

importRouter.post("/csv/preview", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const content = fs.readFileSync(req.file.path, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (records.length === 0) {
      res.status(400).json({ error: "CSV file is empty" });
      return;
    }

    const headers = Object.keys(records[0]);
    const preview = records.slice(0, 10);

    const detected = {
      date: detectColumn(headers, DATE_ALIASES),
      amount: detectColumn(headers, AMOUNT_ALIASES),
      payee: detectColumn(headers, PAYEE_ALIASES),
      debit: detectColumn(headers, DEBIT_ALIASES),
      credit: detectColumn(headers, CREDIT_ALIASES),
    };

    const hasDebitCredit = !detected.amount && (detected.debit || detected.credit);

    res.json({
      filename: req.file.originalname,
      total_rows: records.length,
      headers,
      preview,
      detected,
      amount_format: hasDebitCredit ? "debit_credit" : "signed",
    });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

importRouter.post("/csv/confirm", upload.single("file"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  let mappingData: unknown;
  try {
    mappingData = JSON.parse((req.body as Record<string, string>).mapping ?? "{}");
  } catch {
    res.status(400).json({ error: "Invalid mapping JSON" });
    return;
  }

  const parsed = CsvConfirmSchema.safeParse({
    account_id: parseInt((req.body as Record<string, string>).account_id, 10),
    mapping: mappingData,
    filename: req.file.originalname,
    amount_format: (req.body as Record<string, string>).amount_format ?? "signed",
    debit_column: (req.body as Record<string, string>).debit_column,
    credit_column: (req.body as Record<string, string>).credit_column,
  });

  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    return;
  }

  const { account_id, mapping, amount_format, debit_column, credit_column } = parsed.data;

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(account_id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  try {
    const content = fs.readFileSync(req.file.path, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const insert = db.prepare(
      `INSERT INTO transactions (account_id, amount, payee, notes, date, type)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const dupCheck = db.prepare(
      `SELECT id FROM transactions
       WHERE account_id = ? AND date = ? AND amount = ? AND (payee = ? OR (payee IS NULL AND ? IS NULL))
       LIMIT 1`
    );

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    const insertAll = db.transaction(() => {
      for (const row of records) {
        const rawDate = row[mapping.date]?.trim();
        if (!rawDate) { skipped++; continue; }

        // Normalize date to YYYY-MM-DD
        let date: string;
        try {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) { skipped++; continue; }
          date = d.toISOString().slice(0, 10);
        } catch { skipped++; continue; }

        let amountCents: number;

        if (amount_format === "debit_credit") {
          const debitStr = debit_column ? row[debit_column]?.replace(/[^0-9.-]/g, "") : "";
          const creditStr = credit_column ? row[credit_column]?.replace(/[^0-9.-]/g, "") : "";
          const debit = parseFloat(debitStr || "0") || 0;
          const credit = parseFloat(creditStr || "0") || 0;
          amountCents = Math.round((credit - debit) * 100);
        } else {
          const raw = row[mapping.amount]?.replace(/[^0-9.-]/g, "");
          if (!raw) { skipped++; continue; }
          amountCents = Math.round(parseFloat(raw) * 100);
        }

        if (isNaN(amountCents)) { skipped++; continue; }

        const payee = mapping.payee ? row[mapping.payee]?.trim() ?? null : null;
        const notes = mapping.notes ? row[mapping.notes]?.trim() ?? null : null;
        const type = amountCents >= 0 ? "income" : "expense";

        // Duplicate detection
        const existing = dupCheck.get(account_id, date, amountCents, payee, payee);
        if (existing) { duplicates++; continue; }

        insert.run(account_id, amountCents, payee, notes, date, type);
        imported++;
      }
    });

    insertAll();
    res.json({ imported, skipped, duplicates });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});
