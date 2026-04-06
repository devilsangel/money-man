import type { Budget, CreateBudget } from "@money-man/shared";
import { api } from "./client.js";

export const budgetsApi = {
  list: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return api.get<Budget[]>(`/budgets${qs}`);
  },
  upsert: (data: CreateBudget) => api.post<Budget>("/budgets", data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
};
