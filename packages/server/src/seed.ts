import { db } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

runMigrations();

// Clear existing data (except default categories)
db.exec("DELETE FROM transactions; DELETE FROM budgets; DELETE FROM accounts;");

// Accounts
const checking = db
  .prepare("INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)")
  .run("Main Checking", "checking", 250000); // $2,500.00

const savings = db
  .prepare("INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)")
  .run("Savings", "savings", 1500000); // $15,000.00

const credit = db
  .prepare("INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)")
  .run("Visa Credit Card", "credit_card", 0);

// Get categories
const categories = db
  .prepare("SELECT id, name FROM categories")
  .all() as { id: number; name: string }[];

const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return fmt(d);
};

// Transactions
const txns = [
  { account_id: checking.lastInsertRowid, category_id: catMap["Income"], amount: 500000, payee: "Employer Inc", date: daysAgo(30), type: "income" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Income"], amount: 500000, payee: "Employer Inc", date: daysAgo(2), type: "income" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Housing"], amount: -150000, payee: "Landlord LLC", date: daysAgo(28), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Food & Dining"], amount: -4250, payee: "Whole Foods", date: daysAgo(25), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Food & Dining"], amount: -1800, payee: "Chipotle", date: daysAgo(22), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Transportation"], amount: -6000, payee: "Shell Gas", date: daysAgo(20), type: "expense" },
  { account_id: credit.lastInsertRowid, category_id: catMap["Shopping"], amount: -12999, payee: "Amazon", date: daysAgo(18), type: "expense" },
  { account_id: credit.lastInsertRowid, category_id: catMap["Entertainment"], amount: -1599, payee: "Netflix", date: daysAgo(15), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Utilities"], amount: -8500, payee: "Electric Co", date: daysAgo(12), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Food & Dining"], amount: -3200, payee: "Trader Joe's", date: daysAgo(8), type: "expense" },
  { account_id: credit.lastInsertRowid, category_id: catMap["Healthcare"], amount: -2500, payee: "CVS Pharmacy", date: daysAgo(5), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Food & Dining"], amount: -900, payee: "Starbucks", date: daysAgo(3), type: "expense" },
  { account_id: checking.lastInsertRowid, category_id: catMap["Transportation"], amount: -2800, payee: "Uber", date: daysAgo(1), type: "expense" },
];

const insertTxn = db.prepare(
  "INSERT INTO transactions (account_id, category_id, amount, payee, date, type) VALUES (?, ?, ?, ?, ?, ?)"
);

db.transaction(() => {
  for (const t of txns) {
    insertTxn.run(t.account_id, t.category_id ?? null, t.amount, t.payee, t.date, t.type);
  }
})();

// Budgets for current month
const currentMonth = today.toISOString().slice(0, 7);
const budgets = [
  { category_id: catMap["Food & Dining"], amount: 60000 },
  { category_id: catMap["Transportation"], amount: 20000 },
  { category_id: catMap["Housing"], amount: 150000 },
  { category_id: catMap["Entertainment"], amount: 5000 },
  { category_id: catMap["Shopping"], amount: 30000 },
  { category_id: catMap["Utilities"], amount: 15000 },
  { category_id: catMap["Healthcare"], amount: 10000 },
];

const insertBudget = db.prepare(
  "INSERT OR REPLACE INTO budgets (category_id, amount, month) VALUES (?, ?, ?)"
);
db.transaction(() => {
  for (const b of budgets) {
    insertBudget.run(b.category_id, b.amount, currentMonth);
  }
})();

console.log(`[seed] Created 3 accounts, ${txns.length} transactions, ${budgets.length} budgets`);
