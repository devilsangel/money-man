import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Transaction } from "@money-man/shared";
import { Modal } from "./Modal.js";
import { Button } from "./Button.js";
import { Input } from "./Input.js";
import { Select } from "./Select.js";
import { transactionsApi } from "../api/transactions.js";
import { accountsApi } from "../api/accounts.js";
import { categoriesApi } from "../api/categories.js";

const formSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  account_id: z.coerce.number().int().positive("Account required"),
  to_account_id: z.coerce.number().int().optional(),
  category_id: z.coerce.number().int().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  payee: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().min(1, "Date required"),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionModalProps {
  transaction?: Transaction;
  defaultAccountId?: number;
  onClose: () => void;
}

export function TransactionModal({
  transaction,
  defaultAccountId,
  onClose,
}: TransactionModalProps) {
  const qc = useQueryClient();
  const isEdit = !!transaction;

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      account_id: defaultAccountId ?? accounts[0]?.id,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id ?? undefined,
        amount: Math.abs(transaction.amount) / 100,
        payee: transaction.payee ?? "",
        notes: transaction.notes ?? "",
        date: transaction.date,
      });
    }
  }, [transaction, reset]);

  const type = watch("type");

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const amountCents = Math.round(data.amount * 100);
      const signedAmount =
        data.type === "expense" ? -amountCents : amountCents;

      return transactionsApi.create({
        account_id: data.account_id,
        to_account_id: data.to_account_id,
        category_id: data.category_id ?? null,
        amount: signedAmount,
        payee: data.payee || null,
        notes: data.notes || null,
        date: data.date,
        type: data.type,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction added");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const amountCents = Math.round(data.amount * 100);
      const signedAmount =
        data.type === "expense" ? -amountCents : amountCents;

      return transactionsApi.update(transaction!.id, {
        account_id: data.account_id,
        category_id: data.category_id ?? null,
        amount: signedAmount,
        payee: data.payee || null,
        notes: data.notes || null,
        date: data.date,
        type: data.type,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction updated");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = (data: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Transaction" : "Add Transaction"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Type */}
        <Select label="Type" {...register("type")} error={errors.type?.message}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </Select>

        {/* Account */}
        <Select
          label={type === "transfer" ? "From Account" : "Account"}
          {...register("account_id")}
          error={errors.account_id?.message}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>

        {/* To account (transfer only) */}
        {type === "transfer" && (
          <Select
            label="To Account"
            {...register("to_account_id")}
            error={errors.to_account_id?.message}
          >
            <option value="">— select —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}

        {/* Amount */}
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...register("amount")}
          error={errors.amount?.message}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          {...register("date")}
          error={errors.date?.message}
        />

        {/* Payee */}
        <Input
          label="Payee"
          placeholder="Who paid / who received"
          {...register("payee")}
        />

        {/* Category */}
        {type !== "transfer" && (
          <Select label="Category (optional)" {...register("category_id")}>
            <option value="">— uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </Select>
        )}

        {/* Notes */}
        <Input
          label="Notes"
          placeholder="Optional note"
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
