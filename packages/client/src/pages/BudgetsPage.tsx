import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { budgetsApi } from "../api/budgets.js";
import { categoriesApi } from "../api/categories.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { Modal } from "../components/Modal.js";
import { Select } from "../components/Select.js";
import { Input } from "../components/Input.js";
import { AmountDisplay } from "../components/AmountDisplay.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";

const formSchema = z.object({
  category_id: z.coerce.number().int().positive("Category required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

type FormValues = z.infer<typeof formSchema>;

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function addMonths(m: string, n: number): string {
  const [year, month] = m.split("-").map(Number);
  const d = new Date(year, month - 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BudgetsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showModal, setShowModal] = useState(false);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => budgetsApi.list(month),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: FormValues) =>
      budgetsApi.upsert({
        category_id: data.category_id,
        amount: Math.round(data.amount * 100),
        month,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget saved");
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const totalBudgeted = budgets?.reduce((s, b) => s + b.amount, 0) ?? 0;
  const totalSpent = budgets?.reduce((s, b) => s + (b.spent ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="p-1.5 rounded-full hover:bg-sys-fill transition-colors text-sys-label-secondary"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-title-1 text-sys-label">{formatMonth(month)}</h2>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-full hover:bg-sys-fill transition-colors text-sys-label-secondary"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            reset();
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          Set Budget
        </Button>
      </div>

      {/* Summary */}
      {!isLoading && budgets && budgets.length > 0 && (
        <Card>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-caption text-sys-label-secondary mb-1">Budgeted</p>
              <AmountDisplay cents={totalBudgeted} className="text-title-3 font-bold text-sys-label" />
            </div>
            <div>
              <p className="text-caption text-sys-label-secondary mb-1">Spent</p>
              <AmountDisplay cents={totalSpent} className="text-title-3 font-bold text-system-red" />
            </div>
            <div>
              <p className="text-caption text-sys-label-secondary mb-1">Remaining</p>
              <AmountDisplay
                cents={totalBudgeted - totalSpent}
                className={`text-title-3 font-bold ${totalBudgeted - totalSpent < 0 ? "text-system-red" : "text-system-green"}`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-1.5 w-full" />
            </Card>
          ))}
        </div>
      ) : budgets?.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets for this month"
          description="Set spending limits for your categories to stay on track."
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Set Budget
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {budgets?.map((b) => {
            const pct = b.amount > 0 ? Math.round(((b.spent ?? 0) / b.amount) * 100) : 0;
            const isOver = pct >= 100;

            return (
              <Card key={b.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: (b.category_color ?? "#8E8E93") + "25" }}
                    >
                      {b.category_icon}
                    </span>
                    <span className="text-callout font-medium text-sys-label">
                      {b.category_name}
                    </span>
                    {isOver && (
                      <span className="text-caption text-system-red bg-system-red/10 px-1.5 py-0.5 rounded">
                        Over budget
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-subheadline text-sys-label-secondary">
                      <AmountDisplay cents={b.spent ?? 0} /> /{" "}
                      <AmountDisplay cents={b.amount} />
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-sys-label-tertiary hover:text-system-red"
                      onClick={() => {
                        if (confirm("Remove this budget?")) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ProgressBar value={pct} />
                <p className="text-caption text-sys-label-tertiary mt-1">{pct}% used</p>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title="Set Budget"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit((d) => upsertMutation.mutate(d))}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <form className="flex flex-col gap-4">
            <Select
              label="Category"
              {...register("category_id")}
              error={errors.category_id?.message}
            >
              <option value="">— select —</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
            <Input
              label={`Monthly Limit for ${formatMonth(month)} ($)`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount")}
              error={errors.amount?.message}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
