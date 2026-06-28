"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { issueBookSchema, type IssueBookInput } from "@/lib/validations/circulation";
import { issueBook } from "@/server/actions/circulation";

type MemberOption = {
  id: string;
  membershipNumber: string;
  status: string;
  name: string | null;
  email: string;
};
type BookOption = { id: string; title: string; available: number };

export function IssueBookDialog({
  members,
  books,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  members: MemberOption[];
  books: BookOption[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [pending, startTransition] = React.useTransition();

  const form = useForm<IssueBookInput>({
    resolver: zodResolver(issueBookSchema),
    defaultValues: {
      memberId: "",
      bookId: "",
    },
  });

  function onSubmit(values: IssueBookInput) {
    startTransition(async () => {
      const res = await issueBook({
        memberId: values.memberId,
        bookId: values.bookId,
        dueAt: values.dueAt || undefined,
      });
      if (!res.success) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            form.setError(k as keyof IssueBookInput, { message: msgs?.[0] });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Book issued.");
      setOpen(false);
      form.reset();
    });
  }

  const selectedMember = members.find((m) => m.id === form.watch("memberId"));
  const selectedBook = books.find((b) => b.id === form.watch("bookId"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" /> Issue book
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Issue a book</DialogTitle>
          <DialogDescription>
            Choose a member and a title. An available copy is assigned
            automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="issue-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            {/* Member single-select combobox */}
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
                  <SearchableSelect
                    placeholder="Select a member"
                    searchPlaceholder="Search members…"
                    value={field.value}
                    onChange={field.onChange}
                    selectedLabel={
                      selectedMember
                        ? `${selectedMember.name ?? selectedMember.email} · ${selectedMember.membershipNumber}`
                        : null
                    }
                    options={members.map((m) => ({
                      id: m.id,
                      label: `${m.name ?? m.email} · ${m.membershipNumber}`,
                      hint: m.email,
                      search: `${m.name ?? ""} ${m.membershipNumber} ${m.email}`,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Book single-select combobox */}
            <FormField
              control={form.control}
              name="bookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book</FormLabel>
                  <SearchableSelect
                    placeholder="Select a book"
                    searchPlaceholder="Search titles…"
                    value={field.value}
                    onChange={field.onChange}
                    selectedLabel={
                      selectedBook
                        ? `${selectedBook.title} (${selectedBook.available} available)`
                        : null
                    }
                    options={books.map((b) => ({
                      id: b.id,
                      label: b.title,
                      hint: `${b.available} available`,
                      disabled: b.available <= 0,
                      search: b.title,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().slice(0, 10)
                          : (field.value ?? "")
                      }
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button type="submit" form="issue-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Issue book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SelectOption = {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  search: string;
};

function SearchableSelect({
  options,
  value,
  onChange,
  selectedLabel,
  placeholder,
  searchPlaceholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  selectedLabel: string | null;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.search.toLowerCase().includes(q))
      : options;
    return list.slice(0, 50);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className={selectedLabel ? "truncate" : "text-muted-foreground truncate"}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="relative border-b p-2">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length ? (
            filtered.map((o) => {
              const checked = value === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {o.hint}
                      </span>
                    ) : null}
                  </span>
                  {checked && <Check className="size-4 shrink-0" />}
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No matches.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
