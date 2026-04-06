import { z } from "zod";

// ─── Category ─────────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().nullable(),
  created_at: z.string(),
});

export const CreateCategorySchema = CategorySchema.omit({ id: true, created_at: true });
export const UpdateCategorySchema = CreateCategorySchema.partial();

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

// ─── Account ──────────────────────────────────────────────────────────────────

export const AccountTypeSchema = z.enum([
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
]);

export const AccountSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(100),
  type: AccountTypeSchema,
  currency: z.string().length(3),
  initial_balance: z.number().int(), // cents
  created_at: z.string(),
  archived_at: z.string().nullable(),
  // computed
  balance: z.number().int().optional(),
});

export const CreateAccountSchema = AccountSchema.omit({
  id: true,
  created_at: true,
  archived_at: true,
  balance: true,
});
export const UpdateAccountSchema = CreateAccountSchema.partial();

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccount = z.infer<typeof CreateAccountSchema>;
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionTypeSchema = z.enum(["expense", "income", "transfer"]);

export const TransactionSchema = z.object({
  id: z.number().int(),
  account_id: z.number().int(),
  category_id: z.number().int().nullable(),
  amount: z.number().int(), // cents; negative=expense, positive=income
  payee: z.string().nullable(),
  notes: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: TransactionTypeSchema,
  transfer_id: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // joined
  category_name: z.string().nullable().optional(),
  category_color: z.string().nullable().optional(),
  account_name: z.string().optional(),
});

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  transfer_id: true,
  category_name: true,
  category_color: true,
  account_name: true,
}).extend({
  // for transfers: the destination account
  to_account_id: z.number().int().optional(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.omit({
  to_account_id: true,
}).partial();

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;

// ─── Budget ───────────────────────────────────────────────────────────────────

export const BudgetSchema = z.object({
  id: z.number().int(),
  category_id: z.number().int(),
  amount: z.number().int(), // cents
  month: z.string().regex(/^\d{4}-\d{2}$/),
  created_at: z.string(),
  // joined
  category_name: z.string().optional(),
  category_color: z.string().optional(),
  category_icon: z.string().nullable().optional(),
  spent: z.number().int().optional(), // cents, actual spending this month
});

export const CreateBudgetSchema = BudgetSchema.omit({
  id: true,
  created_at: true,
  category_name: true,
  category_color: true,
  category_icon: true,
  spent: true,
});

export type Budget = z.infer<typeof BudgetSchema>;
export type CreateBudget = z.infer<typeof CreateBudgetSchema>;

// ─── Reports ──────────────────────────────────────────────────────────────────

export const SpendingByCategorySchema = z.object({
  category_id: z.number().int().nullable(),
  category_name: z.string(),
  color: z.string(),
  total_cents: z.number().int(),
});

export const SpendingByMonthSchema = z.object({
  month: z.string(),
  income_cents: z.number().int(),
  expense_cents: z.number().int(),
  net_cents: z.number().int(),
});

export const BalanceHistorySchema = z.object({
  date: z.string(),
  running_balance_cents: z.number().int(),
});

export type SpendingByCategory = z.infer<typeof SpendingByCategorySchema>;
export type SpendingByMonth = z.infer<typeof SpendingByMonthSchema>;
export type BalanceHistory = z.infer<typeof BalanceHistorySchema>;

// ─── CSV Import ───────────────────────────────────────────────────────────────

export const CsvColumnMappingSchema = z.object({
  date: z.string(),
  amount: z.string(),
  payee: z.string().optional(),
  notes: z.string().optional(),
  type: z.string().optional(),
});

export const CsvConfirmSchema = z.object({
  account_id: z.number().int(),
  mapping: CsvColumnMappingSchema,
  filename: z.string(),
  amount_format: z.enum(["signed", "debit_credit"]).default("signed"),
  debit_column: z.string().optional(),
  credit_column: z.string().optional(),
});

export type CsvColumnMapping = z.infer<typeof CsvColumnMappingSchema>;
export type CsvConfirm = z.infer<typeof CsvConfirmSchema>;

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
