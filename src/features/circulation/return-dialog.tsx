"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { returnBookSchema, type ReturnBookInput } from "@/lib/validations/circulation";
import { returnBook } from "@/server/actions/circulation";

export function ReturnDialog({
  borrowingId,
  bookTitle,
  open,
  onOpenChange,
}: {
  borrowingId: string;
  bookTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<ReturnBookInput>({
    resolver: zodResolver(returnBookSchema),
    defaultValues: {
      borrowingId,
      condition: "good",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ borrowingId, condition: "good", notes: "" });
    }
  }, [open, borrowingId, form]);

  function onSubmit(values: ReturnBookInput) {
    startTransition(async () => {
      const res = await returnBook(values);
      if (!res.success) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            form.setError(k as keyof ReturnBookInput, { message: msgs?.[0] });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Returned.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Return book</DialogTitle>
          <DialogDescription>
            Check in “{bookTitle}”. Record its condition on return.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="return-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Any remarks about the condition…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button type="submit" form="return-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Confirm return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
