import type { Category, CreateCategory, UpdateCategory } from "@money-man/shared";
import { api } from "./client.js";

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories"),
  create: (data: CreateCategory) => api.post<Category>("/categories", data),
  update: (id: number, data: UpdateCategory) =>
    api.patch<Category>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
