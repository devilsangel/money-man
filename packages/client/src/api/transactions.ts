import type {
  Transaction,
  CreateTransaction,
  UpdateTransaction,
  PaginatedResponse,
} from "@money-man/shared";
import { api } from "./client.js";

export interface TransactionFilters {
  account_id?: number;
  category_id?: number;
  from?: string;
  to?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    return api.get<PaginatedResponse<Transaction>>(`/transactions${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get<Transaction>(`/transactions/${id}`),
  create: (data: CreateTransaction) => api.post<Transaction>("/transactions", data),
  update: (id: number, data: UpdateTransaction) =>
    api.patch<Transaction>(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
};
