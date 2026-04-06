import type { SpendingByCategory, SpendingByMonth, BalanceHistory } from "@money-man/shared";
import { api } from "./client.js";

export const reportsApi = {
  spendingByCategory: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return api.get<SpendingByCategory[]>(`/reports/spending-by-category${qs ? `?${qs}` : ""}`);
  },
  spendingByMonth: (year?: string) => {
    const qs = year ? `?year=${year}` : "";
    return api.get<SpendingByMonth[]>(`/reports/spending-by-month${qs}`);
  },
  accountBalanceHistory: (accountId: number, from?: string, to?: string) => {
    const params = new URLSearchParams({ account_id: String(accountId) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return api.get<BalanceHistory[]>(`/reports/account-balance-history?${params}`);
  },
};
