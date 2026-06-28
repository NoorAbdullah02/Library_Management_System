"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updatePolicy } from "@/server/actions/settings";

const schema = z.object({
  loanDays: z.coerce.number().int().min(1).max(180),
  finePerDay: z.coerce.number().min(0).max(1000),
  maxBorrowLimit: z.coerce.number().int().min(1).max(100),
  maxRenewals: z.coerce.number().int().min(0).max(20),
  reservationHoldDays: z.coerce.number().int().min(1).max(60),
});
type PolicyValues = z.infer<typeof schema>;

const FIELDS: {
  name: keyof PolicyValues;
  label: string;
  description: string;
  step?: string;
}[] = [
  { name: "loanDays", label: "Loan period (days)", description: "Default days a book can be borrowed." },
  { name: "finePerDay", label: "Fine per day", description: "Charged for each overdue day.", step: "0.01" },
  { name: "maxBorrowLimit", label: "Max borrow limit", description: "Concurrent loans per member." },
  { name: "maxRenewals", label: "Max renewals", description: "Times a loan may be renewed." },
  { name: "reservationHoldDays", label: "Reservation hold (days)", description: "Pickup window once ready." },
];

export function PolicyForm({
  policy,
  canEdit,
}: {
  policy: PolicyValues;
  canEdit: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const form = useForm<PolicyValues>({
    resolver: zodResolver(schema),
    defaultValues: policy,
  });

  function onSubmit(values: PolicyValues) {
    startTransition(async () => {
      const res = await updatePolicy(values);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={f.step ?? "1"}
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{f.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        {canEdit && (
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save policy
          </Button>
        )}
      </form>
    </Form>
  );
}
