import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { categoriesApi } from "../api/categories.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { Modal } from "../components/Modal.js";
import { Input } from "../components/Input.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";
import type { Category } from "@money-man/shared";

const PRESET_COLORS = [
  "#007AFF", "#34C759", "#FF9500", "#FF3B30",
  "#AF52DE", "#5856D6", "#FF2D55", "#30D158",
  "#8E8E93", "#FF6B35", "#5AC8FA", "#FFCC00",
];

const formSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | undefined>();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      categoriesApi.create({
        name: data.name,
        color: data.color,
        icon: data.icon || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      categoriesApi.update(editingCat!.id, {
        name: data.name,
        color: data.color,
        icon: data.icon || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
      setShowModal(false);
      setEditingCat(undefined);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { color: "#007AFF" },
  });

  const selectedColor = watch("color");

  const openCreate = () => {
    setEditingCat(undefined);
    reset({ name: "", color: "#007AFF", icon: "" });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    reset({ name: cat.name, color: cat.color, icon: cat.icon ?? "" });
    setShowModal(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingCat) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-title-1 text-sys-label">Settings</h2>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-headline text-sys-label">Categories</h3>
            <p className="text-footnote text-sys-label-secondary">
              Manage transaction categories
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Category
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : categories?.length === 0 ? (
          <EmptyState
            icon="🏷"
            title="No categories"
            description="Create categories to organize your transactions."
          />
        ) : (
          <ul className="divide-y divide-sys-separator">
            {categories?.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 py-3 group">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cat.color + "25" }}
                >
                  {cat.icon ?? (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-callout text-sys-label">{cat.name}</p>
                  <p className="text-caption font-mono text-sys-label-tertiary">
                    {cat.color}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 rounded text-sys-label-secondary hover:bg-sys-fill transition-colors"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded text-sys-label-secondary hover:text-system-red hover:bg-sys-fill transition-colors"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${cat.name}"? Transactions in this category will become uncategorized.`
                        )
                      ) {
                        deleteMutation.mutate(cat.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showModal && (
        <Modal
          title={editingCat ? "Edit Category" : "New Category"}
          onClose={() => {
            setShowModal(false);
            setEditingCat(undefined);
          }}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowModal(false);
                  setEditingCat(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {isPending ? "Saving…" : editingCat ? "Save Changes" : "Create"}
              </Button>
            </>
          }
        >
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Name"
              placeholder="e.g. Groceries"
              {...register("name")}
              error={errors.name?.message}
            />

            <Input
              label="Icon (emoji)"
              placeholder="🛒"
              {...register("icon")}
            />

            {/* Color picker */}
            <div className="flex flex-col gap-1">
              <label className="text-footnote font-medium text-sys-label-secondary">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full transition-transform ${selectedColor === c ? "scale-125 ring-2 ring-offset-1 ring-sys-label" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setValue("color", c)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setValue("color", e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-sys-separator"
                />
                <span className="text-footnote font-mono text-sys-label-secondary">
                  {selectedColor}
                </span>
              </div>
              {errors.color && (
                <p className="text-caption text-system-red">{errors.color.message}</p>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
