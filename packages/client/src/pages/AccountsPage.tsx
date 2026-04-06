import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Archive } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { accountsApi } from "../api/accounts.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { AmountDisplay } from "../components/AmountDisplay.js";
import { Modal } from "../components/Modal.js";
import { Input } from "../components/Input.js";
import { Select } from "../components/Select.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
};

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: "🏦",
  savings: "🐖",
  credit_card: "💳",
  cash: "💵",
  investment: "📈",
};

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["checking", "savings", "credit_card", "cash", "investment"]),
  currency: z.string().length(3).default("USD"),
  initial_balance: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

export function AccountsPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      accountsApi.create({
        ...data,
        initial_balance: Math.round(data.initial_balance * 100),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created");
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => accountsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account archived");
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
    defaultValues: { type: "checking", currency: "USD", initial_balance: 0 },
  });

  const onSubmit = (data: FormValues) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-title-1 text-sys-label">Accounts</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            reset();
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          New Account
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : accounts?.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="No accounts yet"
          description="Add your first account to start tracking your finances."
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              New Account
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map((account) => {
            const isNegative = (account.balance ?? 0) < 0;
            return (
              <Card
                key={account.id}
                className="group relative"
                onClick={() => navigate(`/accounts/${account.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl mb-2">
                      {ACCOUNT_TYPE_ICONS[account.type]}
                    </p>
                    <p className="text-callout text-sys-label-secondary">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                    <p className="text-headline text-sys-label">{account.name}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-sys-label-tertiary hover:text-system-red"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Archive "${account.name}"?`)) {
                        archiveMutation.mutate(account.id);
                      }
                    }}
                    aria-label="Archive account"
                  >
                    <Archive size={16} />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-sys-separator">
                  <AmountDisplay
                    cents={account.balance ?? 0}
                    showSign
                    className={`text-title-2 font-bold ${isNegative ? "text-system-red" : "text-sys-label"}`}
                  />
                  <p className="text-caption text-sys-label-tertiary mt-0.5">
                    {account.currency} balance
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title="New Account"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </>
          }
        >
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Account Name"
              placeholder="e.g. Main Checking"
              {...register("name")}
              error={errors.name?.message}
            />
            <Select label="Type" {...register("type")} error={errors.type?.message}>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              label="Opening Balance ($)"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("initial_balance")}
              error={errors.initial_balance?.message}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
