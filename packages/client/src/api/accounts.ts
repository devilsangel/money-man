import type { Account, CreateAccount, UpdateAccount } from "@money-man/shared";
import { api } from "./client.js";

export const accountsApi = {
  list: () => api.get<Account[]>("/accounts"),
  get: (id: number) => api.get<Account>(`/accounts/${id}`),
  create: (data: CreateAccount) => api.post<Account>("/accounts", data),
  update: (id: number, data: UpdateAccount) => api.patch<Account>(`/accounts/${id}`, data),
  archive: (id: number) => api.delete(`/accounts/${id}`),
};
